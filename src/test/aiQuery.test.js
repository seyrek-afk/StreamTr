import { describe, it, expect } from 'vitest'
import { parseQuery, EXAMPLE_PROMPTS } from '../lib/aiQuery.js'

const gen = (r) => (r.params.with_genres || '').split(',').filter(Boolean)

describe('parseQuery — kullanıcının verdiği örnekler', () => {
  it('"arkadaşlarla aksiyon, ratingi yüksek, eski kült film" doğru çözülür', () => {
    const r = parseQuery('Evde arkadaşlarla aksiyon içeren bir film izleyeceğiz, ratingi yüksek ama eski kült bir film olsun')
    expect(gen(r)).toContain('28')                          // Aksiyon
    expect(r.mediaTypes).toEqual(['movie'])                 // "film" dedi, "dizi" demedi
    expect(r.params['vote_average.gte']).toBeGreaterThan(7) // "ratingi yüksek"
    expect(r.params.sort_by).toBe('vote_average.desc')
    expect(r.params['_date.lte']).toBeTruthy()              // "eski / kült"
    expect(r.empty).toBe(false)
  })

  it('"Hint sinemasından insan ve dine dair filmler" ülke + tema çıkarır', () => {
    const r = parseQuery('Hint sinemasından insan ve dine dair bir anlatımı olan filmler öner')
    expect(r.params.with_origin_country).toBe('IN')
    expect(r.keywordTerms).toContain('religion')
    expect(r.mediaTypes).toEqual(['movie'])
  })
})

describe('parseQuery — tür', () => {
  it('birden çok türü aynı anda yakalar', () => {
    const r = parseQuery('komedi ve romantik bir şeyler')
    expect(gen(r)).toContain('35')
    expect(gen(r)).toContain('10749')
  })

  it('Türkçe eklerle yazılmış türleri de yakalar', () => {
    expect(gen(parseQuery('aksiyonlu bir film'))).toContain('28')
    expect(gen(parseQuery('korkunç bir şey izleyelim'))).toContain('27')
  })

  it('eşanlamlıları yakalar', () => {
    expect(gen(parseQuery('uzay ve robot temalı'))).toContain('878')
    expect(gen(parseQuery('zombi filmi'))).toContain('27')
    expect(gen(parseQuery('mafya dizisi'))).toContain('80')
  })
})

describe('parseQuery — ülke', () => {
  it('sıfat ve ad biçimlerini tanır', () => {
    expect(parseQuery('kore dizileri').params.with_origin_country).toBe('KR')
    expect(parseQuery('japon sineması').params.with_origin_country).toBe('JP')
    expect(parseQuery('bollywood filmleri').params.with_origin_country).toBe('IN')
    expect(parseQuery('yerli yapımlar').params.with_origin_country).toBe('TR')
  })
})

describe('parseQuery — dönem', () => {
  it('on yıl ifadesini aralığa çevirir', () => {
    const r = parseQuery("90'lar aksiyon filmleri")
    expect(r.params['_date.gte']).toBe('1990-01-01')
    expect(r.params['_date.lte']).toBe('1999-12-31')
  })

  it('"eski / kült" üst sınır koyar', () => {
    expect(parseQuery('eski bir klasik').params['_date.lte']).toBe('2010-12-31')
  })

  it('"yeni / son yıllarda" alt sınır koyar', () => {
    const r = parseQuery('son yıllarda çıkmış bir dizi')
    expect(r.params['_date.gte']).toBeTruthy()
    expect(r.params['_date.lte']).toBeUndefined()
  })
})

describe('parseQuery — içerik türü', () => {
  it('yalnız dizi dendiğinde film aranmaz', () => {
    expect(parseQuery('kore dizileri').mediaTypes).toEqual(['tv'])
  })
  it('yalnız film dendiğinde dizi aranmaz', () => {
    expect(parseQuery('aksiyon filmi').mediaTypes).toEqual(['movie'])
  })
  it('ikisi de belirtilmezse ikisi de aranır', () => {
    expect(parseQuery('aksiyon ve macera').mediaTypes).toEqual(['movie', 'tv'])
  })
})

describe('parseQuery — kalite ve süre', () => {
  it('kalite istenmese bile asgari oy eşiği kalır (çöp sonuç elenir)', () => {
    const r = parseQuery('komedi dizisi')
    expect(r.params['vote_count.gte']).toBeGreaterThan(0)
    expect(r.params['vote_average.gte']).toBeUndefined()
  })

  it('kalite ifadesini kelime sırasından bağımsız yakalar', () => {
    // "yüksek puanlı" kadar sık "puanı yüksek" de yazılıyor; tek yönü tanımak
    // kalite filtresini sessizce uygulanmamış bırakıyordu (üretimde yakalandı).
    for (const p of ['yüksek puanlı film', 'puanı yüksek film', 'ratingi yüksek film', 'imdbsi yüksek film']) {
      expect(parseQuery(p).params['vote_average.gte'], p).toBeGreaterThan(7)
    }
  })

  it('"çok uzun olmasın" süre üst sınırı koyar', () => {
    expect(parseQuery('animasyon, çok uzun olmasın').params['with_runtime.lte']).toBe(100)
  })

  it('"destansı" süre alt sınırı koyar', () => {
    expect(parseQuery('destansı bir yapım').params['with_runtime.gte']).toBe(140)
  })
})

describe('parseQuery — sınırlar', () => {
  it('boş girdide empty döner', () => {
    expect(parseQuery('').empty).toBe(true)
    expect(parseQuery('   ').empty).toBe(true)
  })

  it('hiçbir ipucu yakalanmayan cümlede empty döner', () => {
    // Sistem anlamadığını söylemeli; rastgele sonuç göstermek daha kötü olurdu.
    expect(parseQuery('bugün hava çok güzel').empty).toBe(true)
  })

  it('explain kullanıcıya ne anlaşıldığını anlatır', () => {
    const r = parseQuery('kore korku dizileri')
    const labels = r.explain.map(e => e.label)
    expect(labels).toContain('Tür')
    expect(labels).toContain('Ülke')
    expect(labels).toContain('İçerik')
  })
})

describe('EXAMPLE_PROMPTS', () => {
  it('her örnek gerçekten çözülebilir olmalı — çalışmayan örnek göstermek yanıltıcıdır', () => {
    EXAMPLE_PROMPTS.forEach(p => {
      const r = parseQuery(p)
      expect(r.empty, `çözülemedi: ${p}`).toBe(false)
    })
  })

  it('kalite ima eden örnek gerçekten kalite filtresi üretir', () => {
    // Panelde gösterilen örnek "puanı yüksek" diyorsa sonuç da ona göre
    // filtrelenmeli; aksi halde örnek kendi vaadini tutmuyor demektir.
    EXAMPLE_PROMPTS
      .filter(p => /puan/i.test(p))
      .forEach(p => expect(parseQuery(p).params['vote_average.gte'], p).toBeGreaterThan(7))
  })

  it('örnekler farklı yetenekleri gösterir (tür/ülke/dönem/tema)', () => {
    const all = EXAMPLE_PROMPTS.map(p => parseQuery(p))
    expect(all.some(r => r.params.with_origin_country)).toBe(true)
    expect(all.some(r => r.keywordTerms?.length)).toBe(true)
    expect(all.some(r => r.params['_date.lte'] || r.params['_date.gte'])).toBe(true)
    expect(all.some(r => r.params['vote_average.gte'])).toBe(true)
  })
})
