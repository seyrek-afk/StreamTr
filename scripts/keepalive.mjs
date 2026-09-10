#!/usr/bin/env node
// StreamTR — Supabase keep-alive.
//
// Ücretsiz planda 7 gün istek almayan proje duraklatılır ve DB erişimi kesilir.
// Bu script projeye tek bir hafif istek atarak sayacı sıfırlar. Günlük olarak
// .github/workflows/supabase-keepalive.yml tarafından çalıştırılır; elle de
// çalıştırılabilir:  npm run keepalive
//
// Gereken ortam değişkenleri (VITE_ önekli kopyaları da kabul edilir, böylece
// yerelde mevcut .env dosyası yeterlidir):
//   SUPABASE_URL / VITE_SUPABASE_URL
//   SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY
//
// anon anahtarı gizli değildir (RLS ile korunur), bu yüzden CI secret'ı olarak
// tutulması yeterlidir; service_role anahtarına ihtiyaç YOKTUR.

import { readFileSync } from 'node:fs'

// Yerelde çalışırken .env dosyasındaki VITE_SUPABASE_* değerleri kullanılabilsin.
// CI'da .env yoktur ve gerçek ortam değişkenleri zaten doludur; bu yükleyici var
// olan hiçbir değişkenin üzerine YAZMAZ, yalnızca eksikleri tamamlar.
try {
  const text = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!m) continue // yorum ya da boş satır
    const value = m[2].trim().replace(/^["']|["']$/g, '')
    if (process.env[m[1]] === undefined) process.env[m[1]] = value
  }
} catch {
  // .env yok — CI'da normal.
}

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

if (!url || !key) {
  console.error(
    'HATA: SUPABASE_URL ve SUPABASE_ANON_KEY tanımlı değil.\n' +
      "CI için: GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret.\n" +
      'Yerel için: .env dosyasındaki VITE_SUPABASE_* değerleri kullanılabilir.'
  )
  process.exit(1)
}

const ATTEMPTS = 3
const TIMEOUT_MS = 15_000

/** Tek istek — zaman aşımı sarmalayıcısıyla. */
async function request(path, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url + path, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** DB'ye giden asıl heartbeat. Başarısızlığı ölümcüldür. */
async function ping() {
  const res = await request('/rest/v1/rpc/keepalive_ping', {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })

  const body = await res.text()
  if (!res.ok) {
    // 404 → fonksiyon henüz kurulmamış; en sık yapılan hata budur.
    const hint = res.status === 404 ? " (supabase/schema.sql SQL Editor'da çalıştırıldı mı?)" : ''
    throw new Error('HTTP ' + res.status + hint + ' — ' + body.slice(0, 300))
  }
  return body.trim().replace(/^"|"$/g, '')
}

let lastError
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    const lastPing = await ping()
    console.log('OK — Supabase ayakta. Son heartbeat: ' + lastPing)

    // İkincil sinyal: Auth servisi de yanıt veriyor mu? Uygulamanın giriş akışı
    // buna bağlı. Başarısızlığını ölümcül saymıyoruz; DB pingi zaten geçti.
    try {
      const health = await request('/auth/v1/health', { headers: { apikey: key } })
      if (!health.ok) console.warn('UYARI: auth/v1/health HTTP ' + health.status)
    } catch (err) {
      console.warn('UYARI: auth sağlık kontrolü yapılamadı — ' + err.message)
    }

    process.exit(0)
  } catch (err) {
    lastError = err
    console.warn('Deneme ' + attempt + '/' + ATTEMPTS + ' başarısız: ' + err.message)
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 5000))
  }
}

console.error('HATA: Supabase keep-alive başarısız — ' + lastError?.message)
process.exit(1)
