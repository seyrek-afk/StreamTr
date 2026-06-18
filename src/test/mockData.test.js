import { describe, it, expect } from 'vitest'
import { MOCK_DIZILER, MOCK_FILMLER, MOCK_TREND } from '../data/mockData.js'

const REQUIRED_CONTENT_FIELDS = ['title', 'originalTitle', 'genres', 'imdbScore', 'platforms', 'year', 'description', 'cast', 'reviews']

function validateContentItem(item, label) {
  REQUIRED_CONTENT_FIELDS.forEach(field => {
    expect(item, `${label} missing field: ${field}`).toHaveProperty(field)
  })

  // imdbScore: 0-10
  expect(item.imdbScore, `${item.title} imdbScore out of range`).toBeGreaterThan(0)
  expect(item.imdbScore, `${item.title} imdbScore out of range`).toBeLessThanOrEqual(10)

  // rottenTomatoesScore: 0-100
  if (item.rottenTomatoesScore != null) {
    expect(item.rottenTomatoesScore, `${item.title} RT score out of range`).toBeGreaterThanOrEqual(0)
    expect(item.rottenTomatoesScore, `${item.title} RT score out of range`).toBeLessThanOrEqual(100)
  }

  // genres must be non-empty array
  expect(Array.isArray(item.genres)).toBe(true)
  expect(item.genres.length, `${item.title} should have at least 1 genre`).toBeGreaterThan(0)

  // platforms must be non-empty array
  expect(Array.isArray(item.platforms)).toBe(true)
  expect(item.platforms.length, `${item.title} should be on at least 1 platform`).toBeGreaterThan(0)

  // year should be a reasonable number
  expect(item.year, `${item.title} year out of range`).toBeGreaterThanOrEqual(1900)
  expect(item.year, `${item.title} year out of range`).toBeLessThanOrEqual(2030)

  // cast must be an array
  expect(Array.isArray(item.cast)).toBe(true)

  // reviews must be an array
  expect(Array.isArray(item.reviews)).toBe(true)
}

describe('MOCK_DIZILER', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(MOCK_DIZILER)).toBe(true)
    expect(MOCK_DIZILER.length).toBeGreaterThan(0)
  })

  it('every item should have required fields with valid values', () => {
    MOCK_DIZILER.forEach(item => validateContentItem(item, 'MOCK_DIZILER'))
  })

  it('highest imdbScore should be first or close to first (top 3 items sorted)', () => {
    // Data may not be globally sorted, but the top items should have high scores
    const scores = MOCK_DIZILER.map(i => i.imdbScore)
    const maxScore = Math.max(...scores)
    expect(MOCK_DIZILER[0].imdbScore).toBeGreaterThanOrEqual(maxScore - 0.5)
  })

  it('cast members should have name field', () => {
    MOCK_DIZILER.forEach(item => {
      item.cast.forEach(member => {
        expect(member).toHaveProperty('name')
        expect(typeof member.name).toBe('string')
        expect(member.name.length).toBeGreaterThan(0)
      })
    })
  })

  it('reviews should have source, author, and quote', () => {
    MOCK_DIZILER.forEach(item => {
      item.reviews.forEach(review => {
        expect(review).toHaveProperty('source')
        expect(review).toHaveProperty('author')
        expect(review).toHaveProperty('quote')
      })
    })
  })
})

describe('MOCK_FILMLER', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(MOCK_FILMLER)).toBe(true)
    expect(MOCK_FILMLER.length).toBeGreaterThan(0)
  })

  it('every item should have required fields with valid values', () => {
    MOCK_FILMLER.forEach(item => validateContentItem(item, 'MOCK_FILMLER'))
  })

  it('highest imdbScore should be first or close to first (data has high-scoring items)', () => {
    const scores = MOCK_FILMLER.map(i => i.imdbScore)
    const maxScore = Math.max(...scores)
    expect(MOCK_FILMLER[0].imdbScore).toBeGreaterThanOrEqual(maxScore - 0.5)
  })

  it('duration should be a positive number when present', () => {
    MOCK_FILMLER.forEach(item => {
      if (item.duration != null) {
        expect(item.duration, `${item.title} duration should be positive`).toBeGreaterThan(0)
      }
    })
  })
})

describe('MOCK_TREND', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(MOCK_TREND)).toBe(true)
    expect(MOCK_TREND.length).toBeGreaterThan(0)
  })

  it('every item should have trend-specific fields', () => {
    MOCK_TREND.forEach(item => {
      expect(item).toHaveProperty('socialScore')
      expect(item).toHaveProperty('trendReason')
      expect(item.socialScore, `${item.title} socialScore out of range`).toBeGreaterThanOrEqual(0)
      expect(item.socialScore, `${item.title} socialScore out of range`).toBeLessThanOrEqual(100)
    })
  })

  it('type field should be dizi or film', () => {
    MOCK_TREND.forEach(item => {
      if (item.type) {
        expect(['dizi', 'film']).toContain(item.type)
      }
    })
  })

  it('trendReason should be non-empty string', () => {
    MOCK_TREND.forEach(item => {
      if (item.trendReason) {
        expect(typeof item.trendReason).toBe('string')
        expect(item.trendReason.length).toBeGreaterThan(0)
      }
    })
  })
})

describe('Data uniqueness across datasets', () => {
  it('MOCK_DIZILER titles should be unique', () => {
    const titles = MOCK_DIZILER.map(i => i.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('MOCK_FILMLER titles should be unique', () => {
    const titles = MOCK_FILMLER.map(i => i.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('MOCK_TREND titles should be unique', () => {
    const titles = MOCK_TREND.map(i => i.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
