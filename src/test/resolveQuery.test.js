import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase istemcisi test ortamında yapılandırılmadığı için modül seviyesinde
// taklit edilir; her senaryo kendi oturum/uç davranışını kurar.
const mockAuth = { getSession: vi.fn() }
const mockFunctions = { invoke: vi.fn() }

vi.mock('../lib/supabase.js', () => ({
  get supabase() { return globalThis.__sbMock },
  isSupabaseConfigured: true,
}))

const { resolveQuery, parseQuery } = await import('../lib/aiQuery.js')

const withSupabase = () => {
  globalThis.__sbMock = { auth: mockAuth, functions: mockFunctions }
}

beforeEach(() => {
  vi.clearAllMocks()
  globalThis.__sbMock = null
})

const AI_PAYLOAD = {
  params: { sort_by: 'vote_average.desc', 'vote_average.gte': 7.5, 'vote_count.gte': 200 },
  mediaTypes: ['movie'],
  genreKeys: ['gerilim', 'suc'],
  keywordTerms: ['revenge'],
  explain: [{ label: 'Ruh hâli', value: 'gergin' }],
  empty: false,
  source: 'ai',
}

describe('resolveQuery — LLM ucu', () => {
  it('uç çözerse LLM sonucunu kullanır', async () => {
    withSupabase()
    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    mockFunctions.invoke.mockResolvedValue({ data: AI_PAYLOAD, error: null })

    const r = await resolveQuery('içimi karartmayan ama gergin bir intikam hikâyesi')
    expect(r.source).toBe('ai')
    expect(r.genreKeys).toEqual(['gerilim', 'suc'])
    expect(r.keywordTerms).toEqual(['revenge'])
    expect(r.notice).toBeNull()
    expect(mockFunctions.invoke).toHaveBeenCalledWith('ai-search', expect.objectContaining({
      body: { text: 'içimi karartmayan ama gergin bir intikam hikâyesi' },
    }))
  })

  it('metni kırpılmış hâliyle gönderir', async () => {
    withSupabase()
    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    mockFunctions.invoke.mockResolvedValue({ data: AI_PAYLOAD, error: null })

    await resolveQuery('   kore dizisi   ')
    expect(mockFunctions.invoke).toHaveBeenCalledWith('ai-search', expect.objectContaining({
      body: { text: 'kore dizisi' },
    }))
  })
})

describe('resolveQuery — yedeğe düşüş', () => {
  // Yedek katman özelliğin hiç kaybolmamasını sağlar. Her düşüş sebebinde
  // kullanıcıya NEDEN daha zayıf sonuç aldığı söylenmeli — sessiz düşüş,
  // kullanıcının sonucu yanlış yorumlamasına yol açar.
  const expectLocalFallback = (r) => {
    expect(r.source).toBe('local')
    expect(r.notice).toBeTruthy()
    // Yedek gerçekten çalışmış olmalı, boş kabuk dönmemeli.
    expect(r.genreKeys).toContain('korku')
    expect(r.mediaTypes).toEqual(['tv'])
  }

  it('Supabase yapılandırılmamışsa yerel ayrıştırıcıya düşer', async () => {
    const r = await resolveQuery('kore korku dizileri')
    expectLocalFallback(r)
  })

  it('giriş yoksa yerel ayrıştırıcıya düşer ve girişi söyler', async () => {
    withSupabase()
    mockAuth.getSession.mockResolvedValue({ data: { session: null } })

    const r = await resolveQuery('kore korku dizileri')
    expectLocalFallback(r)
    expect(r.notice).toMatch(/giriş/i)
    expect(mockFunctions.invoke).not.toHaveBeenCalled()
  })

  it('kota dolduğunda yerel ayrıştırıcıya düşer ve kotayı söyler', async () => {
    withSupabase()
    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    mockFunctions.invoke.mockResolvedValue({
      data: null,
      error: { context: { json: async () => ({ error: 'quota_exceeded' }) } },
    })

    const r = await resolveQuery('kore korku dizileri')
    expectLocalFallback(r)
    expect(r.notice).toMatch(/hak|kota/i)
  })

  it('uç patlarsa yerel ayrıştırıcıya düşer', async () => {
    withSupabase()
    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    mockFunctions.invoke.mockRejectedValue(new Error('network down'))

    expectLocalFallback(await resolveQuery('kore korku dizileri'))
  })

  it('uç bozuk gövde dönerse yerel ayrıştırıcıya düşer', async () => {
    withSupabase()
    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } })
    mockFunctions.invoke.mockResolvedValue({ data: { nonsense: true }, error: null })

    expectLocalFallback(await resolveQuery('kore korku dizileri'))
  })

  it('boş metinde ağ çağrısı yapmaz', async () => {
    withSupabase()
    const r = await resolveQuery('   ')
    expect(r.empty).toBe(true)
    expect(mockAuth.getSession).not.toHaveBeenCalled()
    expect(mockFunctions.invoke).not.toHaveBeenCalled()
  })

  it('yedek çıktısı yerel ayrıştırıcıyla birebir aynı sözleşmeyi taşır', async () => {
    const r = await resolveQuery('90\'lar aksiyon filmleri')
    const local = parseQuery('90\'lar aksiyon filmleri')
    expect(r.params).toEqual(local.params)
    expect(r.mediaTypes).toEqual(local.mediaTypes)
    expect(r.genreKeys).toEqual(local.genreKeys)
  })
})
