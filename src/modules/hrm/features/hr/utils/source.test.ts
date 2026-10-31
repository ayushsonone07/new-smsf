import { describe, expect, it } from 'vitest'
import {
  canonicalSourceKey,
  normalizeSourceForSave,
  normalizeSourceKey,
  prettySource,
} from './source'

describe('normalizeSourceKey', () => {
  it('lowercases and snake-cases source names', () => {
    expect(normalizeSourceKey('  LinkedIn ')).toBe('linkedin')
    expect(normalizeSourceKey('Walk in')).toBe('walk_in')
    expect(normalizeSourceKey('Walk-In')).toBe('walk_in')
  })
})

describe('canonicalSourceKey', () => {
  it('maps the common misspelling to college', () => {
    expect(canonicalSourceKey('Collage')).toBe('college')
    expect(canonicalSourceKey('COLLEGE')).toBe('college')
  })
})

describe('prettySource', () => {
  it('returns friendly labels for known sources', () => {
    expect(prettySource('linkedin')).toBe('LinkedIn')
    expect(prettySource('naukri')).toBe('Naukri')
    expect(prettySource('walk_in')).toBe('Walk-in')
    expect(prettySource('Collage')).toBe('College')
  })

  it('falls back to the trimmed original and then Other', () => {
    expect(prettySource('  Internal Event  ')).toBe('Internal Event')
    expect(prettySource('   ')).toBe('Other')
  })
})

describe('normalizeSourceForSave', () => {
  it('saves the canonical key', () => {
    expect(normalizeSourceForSave('Walk In')).toBe('walk_in')
    expect(normalizeSourceForSave('Collage')).toBe('college')
  })
})
