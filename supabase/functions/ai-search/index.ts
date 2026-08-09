// ─────────────────────────────────────────────────────────────────────────────
// "AI ile Ara" — serbest Türkçe metni TMDB keşif niyetine çeviren sunucu ucu.
//
// NEDEN SUNUCU? StreamTR statik bir sitedir. Anthropic anahtarı istemci
// paketine gömülemez (VITE_* değişkenleri build'e yazılır ve tarayıcıda
// görünür). Anahtar yalnız burada, Supabase secret'ında durur.
//
// NEDEN GİRİŞ ZORUNLU? Bu uç site sahibinin ödediği API'ye vekillik eder.
// Açık bırakılsa faturayı herkes yazabilirdi. Çağrı Supabase JWT'si ile
// kimliklenir ve kişi başı günlük tavana bağlanır. Girişi olmayan ziyaretçi
// özelliği kaybetmez: istemci deterministik ayrıştırıcıya düşer.
//
// SÖZLEŞME: gövde {"text": "..."} alır, istemcinin beklediği çözüm nesnesini
// döndürür (bkz. src/lib/aiQuery.js). Modelin çıktısı DOĞRUDAN TMDB
// parametresi DEĞİLDİR: model kısıtlı bir "niyet" şeması üretir, TMDB
// parametreleri burada bu niyetten türetilir. Böylece model rastgele sorgu
// parametresi enjekte edemez ve şema doğrulaması dar kalır.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.71.0'
import { createClient } from 'npm:@supabase/supabase-js@^2.108.2'

const MODEL       = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-5'
const DAILY_QUOTA = Number(Deno.env.get('AI_SEARCH_DAILY_QUOTA') ?? '20')
const ALLOWED_ORIGINS = (Deno.env.get('AI_SEARCH_ALLOWED_ORIGINS') ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)

const MAX_INPUT_CHARS = 400   // panel de aynı sınırı uygular
const VOTE_MIN = 50           // src/lib/discover.js ile aynı taban

// ── Tür sözlüğü ──────────────────────────────────────────────────────────────
// TMDB'de film ve dizi tür id'leri AYRIDIR (Aksiyon film=28, dizi=10759;
// Bilim Kurgu film=878, dizi=10765). Tek listeyi iki uca da göndermek diziyi
// sessizce boş döndürüyordu. Anahtarlar kanonik, id çevirimi istemcide
// (src/lib/genres.js) medya türüne göre yapılır — burada yalnız anahtar üretilir.
const GENRE_KEYS = [
  'aksiyon', 'macera', 'animasyon', 'komedi', 'suc', 'belgesel', 'dram',
  'aile', 'fantastik', 'tarih', 'korku', 'muzik', 'gizem', 'romantik',
  'bilimkurgu', 'gerilim', 'savas', 'western',
] as const

const COUNTRY_CODES = [
  'DE', 'US', 'AR', 'AU', 'BE', 'BR', 'CZ', 'CN', 'DK', 'ID', 'FR', 'KR',
  'IN', 'NL', 'HK', 'GB', 'IR', 'IE', 'ES', 'SE', 'IT', 'CA', 'MX', 'EG',
  'NO', 'PL', 'RU', 'TW', 'TH', 'TR', 'JP',
] as const

const INTENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'understood', 'mediaTypes', 'genreKeys', 'originCountry', 'keywordTerms',
    'yearFrom', 'yearTo', 'minRating', 'runtimeMin', 'runtimeMax', 'sortBy', 'explain',
  ],
  properties: {
    understood: {
      type: 'boolean',
      description: 'Cümleden en az bir arama ipucu (tür, ülke, dönem, tema, kalite, süre) çıkarılabildiyse true. Konuyla ilgisiz metinde false.',
    },
    mediaTypes: {
      type: 'array',
      description: 'Kullanıcı yalnız film dediyse ["movie"], yalnız dizi dediyse ["tv"], belirtmediyse ikisi.',
      items: { type: 'string', enum: ['movie', 'tv'] },
    },
    genreKeys: {
      type: 'array',
      description: 'Cümlede geçen türler. Yalnız açıkça ima edilenleri koy; emin değilsen boş bırak.',
      items: { type: 'string', enum: [...GENRE_KEYS] },
    },
    originCountry: {
      description: 'Yapım ülkesi ISO kodu; belirtilmediyse null.',
      anyOf: [{ type: 'string', enum: [...COUNTRY_CODES] }, { type: 'null' }],
    },
    keywordTerms: {
      type: 'array',
      description: 'Tür ile ifade edilemeyen tema/konu için TMDB anahtar kelimesi olarak aranacak İNGİLİZCE terimler (ör. "revenge", "time travel", "religion"). En fazla 3. Tema yoksa boş dizi.',
      items: { type: 'string' },
    },
    yearFrom:   { description: 'Dönem alt sınırı (yıl); yoksa null.', anyOf: [{ type: 'integer' }, { type: 'null' }] },
    yearTo:     { description: 'Dönem üst sınırı (yıl); yoksa null.', anyOf: [{ type: 'integer' }, { type: 'null' }] },
    minRating:  { description: 'Asgari TMDB puanı 0-10; kalite imâsı yoksa null.', anyOf: [{ type: 'number' }, { type: 'null' }] },
    runtimeMin: { description: 'Asgari süre (dakika, yalnız film); yoksa null.', anyOf: [{ type: 'integer' }, { type: 'null' }] },
    runtimeMax: { description: 'Azami süre (dakika, yalnız film); yoksa null.', anyOf: [{ type: 'integer' }, { type: 'null' }] },
    sortBy: {
      type: 'string',
      description: 'populerlik = varsayılan; puan = kalite vurgulandıysa; yenilik = güncellik vurgulandıysa.',
      enum: ['populerlik', 'puan', 'yenilik'],
    },
    explain: {
      type: 'array',
      description: 'Kullanıcıya gösterilecek "Anladığım" rozetleri. Kısa Türkçe. Örn: {label:"Tür", value:"aksiyon, gerilim"}.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value'],
        properties: { label: { type: 'string' }, value: { type: 'string' } },
      },
    },
  },
}

const SYSTEM = `Kullanıcının kendi cümleleriyle yazdığı film/dizi isteğini yapılandırılmış bir arama niyetine çevirirsin. Kullanıcı Türkçe yazar; günlük dil, argo, yazım hatası ve dolaylı anlatım olağandır ("kafa dağıtacak bir şey", "ağlatan kore dizisi", "eşimle izleyebileceğimiz hafif bir şey").

Cümlenin ima ettiğini çıkar, olmayanı uydurma. Ruh hâli ifadelerini uygun türe çevir (ör. "kafa dağıtsın" → komedi; "geceyi uykusuz geçireyim" → korku/gerilim). Tür sözlüğüyle ifade edilemeyen konuları keywordTerms'e İngilizce koy. "Eski/kült/klasik" gibi ifadeleri yıl aralığına, "yüksek puanlı/başyapıt" gibi ifadeleri minRating'e çevir. İzleme bağlamı da bir sinyaldir: "ailecek"/"çocuklarla" aile türünü ve düşük süreyi ima eder.

explain alanında ne anladığını kısa Türkçe rozetlerle söyle — kullanıcı yanlış anladığında cümlesini düzeltebilsin. Cümleden hiçbir arama ipucu çıkmıyorsa understood=false döndür ve alanları boş bırak.`

// ── Yardımcılar ──────────────────────────────────────────────────────────────

function corsHeaders(origin: string | null) {
  // Liste boşsa (yapılandırılmamışsa) izin verilir; tanımlıysa yalnız listedeki
  // kökenler. Uç zaten JWT ister — CORS ikinci savunma hattıdır.
  const allow = ALLOWED_ORIGINS.length === 0
    ? (origin ?? '*')
    : (origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0])
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  })
}

const clampNum = (v: unknown, lo: number, hi: number): number | null => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : NaN
  return Number.isNaN(n) ? null : Math.min(hi, Math.max(lo, n))
}

// Modelin niyetini TMDB keşif parametrelerine çevirir. Tarih alanları medya
// türüne göre farklıdır (film primary_release_date, dizi first_air_date);
// bu yüzden yer tutucu `_date.*` olarak bırakılır, istemci uca göre çözer.
function toParams(intent: Record<string, unknown>) {
  const params: Record<string, string | number> = {}

  const yearFrom = clampNum(intent.yearFrom, 1900, 2100)
  const yearTo   = clampNum(intent.yearTo, 1900, 2100)
  if (yearFrom) params['_date.gte'] = `${Math.round(yearFrom)}-01-01`
  if (yearTo)   params['_date.lte'] = `${Math.round(yearTo)}-12-31`

  const minRating = clampNum(intent.minRating, 0, 10)
  if (minRating) {
    params['vote_average.gte'] = minRating
    // Puan filtresi oy sayısı olmadan anlamsız: 3 oyla 10/10 alan yapım tepeye
    // çıkar. Kalite istendiğinde eşik yükseltilir.
    params['vote_count.gte'] = 200
  } else {
    params['vote_count.gte'] = VOTE_MIN
  }

  const rtMin = clampNum(intent.runtimeMin, 1, 600)
  const rtMax = clampNum(intent.runtimeMax, 1, 600)
  if (rtMin) params['with_runtime.gte'] = Math.round(rtMin)
  if (rtMax) params['with_runtime.lte'] = Math.round(rtMax)

  const country = typeof intent.originCountry === 'string' &&
    (COUNTRY_CODES as readonly string[]).includes(intent.originCountry)
      ? intent.originCountry : null
  if (country) params.with_origin_country = country

  params.sort_by = intent.sortBy === 'puan'
    ? 'vote_average.desc'
    : intent.sortBy === 'yenilik' ? 'primary_release_date.desc' : 'popularity.desc'

  return params
}

function normalize(intent: Record<string, unknown>) {
  const genreKeys = Array.isArray(intent.genreKeys)
    ? intent.genreKeys.filter((k): k is string =>
        typeof k === 'string' && (GENRE_KEYS as readonly string[]).includes(k))
    : []

  const mediaTypes = Array.isArray(intent.mediaTypes)
    ? intent.mediaTypes.filter((m): m is string => m === 'movie' || m === 'tv')
    : []

  const keywordTerms = Array.isArray(intent.keywordTerms)
    ? intent.keywordTerms
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .slice(0, 3)
        .map((t) => t.trim().toLowerCase())
    : []

  const explain = Array.isArray(intent.explain)
    ? intent.explain
        .filter((e): e is { label: string; value: string } =>
          !!e && typeof (e as any).label === 'string' && typeof (e as any).value === 'string')
        .slice(0, 8)
    : []

  return {
    params: toParams(intent),
    mediaTypes: mediaTypes.length ? mediaTypes : ['movie', 'tv'],
    genreKeys,
    keywordTerms,
    explain,
    empty: intent.understood === false,
  }
}

// ── Uç ───────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST')    return json({ error: 'method_not_allowed' }, 405, origin)

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  const supabaseUrl  = Deno.env.get('SUPABASE_URL')
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!anthropicKey || !supabaseUrl || !serviceKey) {
    return json({ error: 'not_configured' }, 503, origin)
  }

  // 1) Kimlik — giriş yapmamış çağrı burada durur.
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'auth_required' }, 401, origin)

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  const user = userData?.user
  if (userErr || !user) return json({ error: 'auth_required' }, 401, origin)

  // 2) Girdi
  let text = ''
  try {
    const body = await req.json()
    text = typeof body?.text === 'string' ? body.text.trim() : ''
  } catch {
    return json({ error: 'bad_request' }, 400, origin)
  }
  if (!text) return json({ error: 'bad_request' }, 400, origin)
  text = text.slice(0, MAX_INPUT_CHARS)

  // 3) Kota — model çağrısından ÖNCE tüketilir; aşan istek para harcamaz.
  const { data: quotaRows, error: quotaErr } = await admin
    .rpc('ai_search_consume', { p_user: user.id, p_limit: DAILY_QUOTA })
  if (quotaErr) return json({ error: 'quota_unavailable' }, 503, origin)

  const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows
  if (!quota?.allowed) {
    return json(
      { error: 'quota_exceeded', used: quota?.used ?? DAILY_QUOTA, quota: DAILY_QUOTA },
      429, origin,
    )
  }

  // 4) Model
  try {
    const client = new Anthropic({ apiKey: anthropicKey })
    const year = new Date().getUTCFullYear()

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: `${SYSTEM}\n\nİçinde bulunduğumuz yıl: ${year}.`,
      output_config: {
        // Ayrıştırma işi derin akıl yürütme istemez; düşük efor gecikmeyi ve
        // maliyeti düşürür. Düşünme AÇIK bırakılır — kapatmak bu modelde
        // araç/etiket sızıntısı davranışlarını tetikliyor.
        effort: 'low',
        format: { type: 'json_schema', schema: INTENT_SCHEMA },
      },
      messages: [{ role: 'user', content: text }],
    } as Parameters<typeof client.messages.create>[0])

    if (msg.stop_reason === 'refusal') {
      return json({ error: 'refused' }, 422, origin)
    }

    const block = msg.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') return json({ error: 'bad_model_output' }, 502, origin)

    const intent = JSON.parse(block.text)
    return json(
      { ...normalize(intent), source: 'ai', used: quota.used, quota: DAILY_QUOTA },
      200, origin,
    )
  } catch (e) {
    console.error('[ai-search] model çağrısı başarısız:', e instanceof Error ? e.message : e)
    // İstemci deterministik ayrıştırıcıya düşecek; ayrıntı sızdırılmaz.
    return json({ error: 'model_failed' }, 502, origin)
  }
})
