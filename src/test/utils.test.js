/**
 * Pure utility function tests.
 * These functions exist inside the hooks but are not exported.
 * Tests verify the logic is correct at each boundary condition.
 */
import { describe, it, expect } from 'vitest'

// ── fmtCount logic ─────────────────────────────────────────────────────────────
function fmtCount(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

describe('fmtCount', () => {
  it('returns — for falsy values', () => {
    expect(fmtCount(0)).toBe('—')
    expect(fmtCount(null)).toBe('—')
    expect(fmtCount(undefined)).toBe('—')
  })

  it('returns raw string for numbers under 1000', () => {
    expect(fmtCount(1)).toBe('1')
    expect(fmtCount(500)).toBe('500')
    expect(fmtCount(999)).toBe('999')
  })

  it('formats thousands with k suffix', () => {
    expect(fmtCount(1000)).toBe('1.0k')
    expect(fmtCount(1500)).toBe('1.5k')
    expect(fmtCount(999999)).toBe('1000.0k')
  })

  it('formats millions with M suffix', () => {
    expect(fmtCount(1_000_000)).toBe('1.0M')
    expect(fmtCount(2_500_000)).toBe('2.5M')
    expect(fmtCount(10_000_000)).toBe('10.0M')
  })
})

// ── estimateRT logic ────────────────────────────────────────────────────────────
function estimateRT(avg) {
  if (!avg) return null
  return Math.min(99, Math.max(20, Math.round(avg * 9.8 + 1)))
}

describe('estimateRT', () => {
  it('returns null for falsy input', () => {
    expect(estimateRT(0)).toBeNull()
    expect(estimateRT(null)).toBeNull()
    expect(estimateRT(undefined)).toBeNull()
  })

  it('returns value within 20-99 range', () => {
    for (let avg = 0.5; avg <= 10; avg += 0.5) {
      const result = estimateRT(avg)
      if (result !== null) {
        expect(result).toBeGreaterThanOrEqual(20)
        expect(result).toBeLessThanOrEqual(99)
      }
    }
  })

  it('clamps minimum to 20', () => {
    expect(estimateRT(0.1)).toBeGreaterThanOrEqual(20)
    expect(estimateRT(1)).toBeGreaterThanOrEqual(20)
  })

  it('clamps maximum to 99', () => {
    expect(estimateRT(10)).toBe(99)
    expect(estimateRT(9.9)).toBeLessThanOrEqual(99)
  })

  it('scales linearly: higher average → higher RT', () => {
    expect(estimateRT(8)).toBeGreaterThan(estimateRT(6))
    expect(estimateRT(6)).toBeGreaterThan(estimateRT(4))
  })

  it('returns integer', () => {
    expect(Number.isInteger(estimateRT(7.5))).toBe(true)
  })
})

// ── estimateLB logic ────────────────────────────────────────────────────────────
function estimateLB(avg) {
  if (!avg) return null
  return Number((avg * 0.47 + 0.08).toFixed(2))
}

describe('estimateLB', () => {
  it('returns null for falsy input', () => {
    expect(estimateLB(0)).toBeNull()
    expect(estimateLB(null)).toBeNull()
    expect(estimateLB(undefined)).toBeNull()
  })

  it('returns a number with 2 decimal places', () => {
    const result = estimateLB(7.5)
    expect(result).not.toBeNull()
    expect(typeof result).toBe('number')
    const str = result.toString()
    const decimals = str.includes('.') ? str.split('.')[1].length : 0
    expect(decimals).toBeLessThanOrEqual(2)
  })

  it('scales linearly: higher average → higher letterboxd score', () => {
    expect(estimateLB(9)).toBeGreaterThan(estimateLB(7))
    expect(estimateLB(7)).toBeGreaterThan(estimateLB(5))
  })

  it('result for 10/10 should be around 4.78', () => {
    expect(estimateLB(10)).toBeCloseTo(4.78, 1)
  })

  it('result for 1/10 should be around 0.55', () => {
    expect(estimateLB(1)).toBeCloseTo(0.55, 1)
  })
})

// ── buildTrendReason logic ──────────────────────────────────────────────────────
function buildTrendReason(item, rank, isMovie) {
  const dateStr = isMovie ? item.release_date : item.first_air_date
  const parts = []

  if (dateStr) {
    const days = (Date.now() - new Date(dateStr)) / 86_400_000
    if (days < 7)        parts.push('Bu hafta yayınlandı')
    else if (days < 30)  parts.push('Bu ay çıktı')
    else if (days < 90)  parts.push('Son 3 ayın gözde yapımı')
  }

  if      (rank <= 3)  parts.push('TMDB haftalık trendin zirvesi')
  else if (rank <= 10) parts.push('Bu haftanın top 10 yapımı')
  else if (rank <= 25) parts.push('Bu hafta yoğun ilgi gören yapım')

  if (item.vote_count  > 5_000) parts.push(`${fmtCount(item.vote_count)} oy topladı`)
  if (item.popularity  > 1_000) parts.push('Sosyal medyada viral')
  else if (item.popularity > 300) parts.push('Geniş kitlelere ulaştı')

  return parts.slice(0, 3).join(' · ') || `TMDB bu hafta #${rank} trend`
}

describe('buildTrendReason', () => {
  it('falls back to rank string when no data matches', () => {
    const item = { vote_count: 100, popularity: 50 }
    const reason = buildTrendReason(item, 50, true)
    expect(reason).toBe('TMDB bu hafta #50 trend')
  })

  it('includes zirvesi for rank 1', () => {
    const item = { vote_count: 100, popularity: 50, release_date: null }
    const reason = buildTrendReason(item, 1, true)
    expect(reason).toContain('TMDB haftalık trendin zirvesi')
  })

  it('includes top 10 for rank 5', () => {
    const item = { vote_count: 100, popularity: 50 }
    const reason = buildTrendReason(item, 5, true)
    expect(reason).toContain('Bu haftanın top 10 yapımı')
  })

  it('includes viral for high popularity', () => {
    const item = { vote_count: 100, popularity: 1500 }
    const reason = buildTrendReason(item, 50, true)
    expect(reason).toContain('Sosyal medyada viral')
  })

  it('includes vote count for items with > 5000 votes', () => {
    const item = { vote_count: 10000, popularity: 50 }
    const reason = buildTrendReason(item, 50, true)
    expect(reason).toContain('oy topladı')
  })

  it('limits parts to 3', () => {
    const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().slice(0, 10)
    const item = { release_date: yesterday, vote_count: 10000, popularity: 1500 }
    const parts = buildTrendReason(item, 1, true).split(' · ')
    expect(parts.length).toBeLessThanOrEqual(3)
  })

  it('handles TV show first_air_date', () => {
    const item = { first_air_date: null, vote_count: 100, popularity: 50 }
    const reason = buildTrendReason(item, 50, false)
    expect(typeof reason).toBe('string')
    expect(reason.length).toBeGreaterThan(0)
  })
})

// ── tmdbToTrendCard social score calculation ────────────────────────────────────
function computeSocialScore({ rank, voteAverage, voteCount, popularity }) {
  const rankScore      = Math.max(0, Math.round(100 - (rank - 1) * 1.2))
  const voteScore      = Math.round((voteAverage || 0) * 10)
  const voteCountScore = Math.min(100, Math.round(Math.log10(Math.max(1, voteCount || 1)) * 28))
  const popScore       = Math.min(100, Math.round(Math.log10(Math.max(1, popularity || 1)) * 35))
  return Math.round(
    rankScore      * 0.40 +
    voteScore      * 0.30 +
    popScore       * 0.20 +
    voteCountScore * 0.10
  )
}

describe('socialScore calculation', () => {
  it('rank 1 with perfect score gives high social score', () => {
    const score = computeSocialScore({ rank: 1, voteAverage: 9, voteCount: 10000, popularity: 500 })
    expect(score).toBeGreaterThan(70)
  })

  it('rank 100 with low vote average gives lower score than rank 1', () => {
    const high = computeSocialScore({ rank: 1, voteAverage: 9, voteCount: 5000, popularity: 200 })
    const low  = computeSocialScore({ rank: 100, voteAverage: 4, voteCount: 500, popularity: 50 })
    expect(high).toBeGreaterThan(low)
  })

  it('score should be in 0-100 range for realistic inputs', () => {
    const score = computeSocialScore({ rank: 1, voteAverage: 10, voteCount: 1_000_000, popularity: 5000 })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('rank score decreases as rank increases', () => {
    const rank1  = Math.max(0, Math.round(100 - (1  - 1) * 1.2))
    const rank50 = Math.max(0, Math.round(100 - (50 - 1) * 1.2))
    expect(rank1).toBeGreaterThan(rank50)
  })
})
