import { describe, expect, it } from 'vitest'
import { coverLayoutsKey, coverSpecs, normalizeCoverLayout, readBrandPreset, safeCoverFilename, saveCoverLayout } from './cover-studio'

describe('cover studio rules', () => {
  it('uses platform-native portrait cover sizes', () => {
    expect(coverSpecs['小红书']).toEqual({ width: 1080, height: 1440, label: '3:4 竖版封面' })
    expect(coverSpecs['抖音']).toEqual({ width: 1080, height: 1920, label: '9:16 视频封面' })
  })

  it('sanitizes cover download filenames', () => {
    expect(safeCoverFilename('新品/礼盒:*?')).toBe('新品-礼盒')
  })

  it('falls back when the local preset is malformed', () => {
    localStorage.setItem('zaowutai.brand-preset', '{broken')
    expect(readBrandPreset()).toMatchObject({ brandName: '造物台', primaryColor: '#8f2f24' })
  })

  it('rejects invalid persisted colors', () => {
    localStorage.setItem('zaowutai.brand-preset', JSON.stringify({ brandName: '测试', primaryColor: 'red;bad', accentColor: '#fff', topics: '' }))
    expect(readBrandPreset()).toMatchObject({ primaryColor: '#8f2f24', accentColor: '#d8b56a' })
  })

  it('clamps persisted cover layout values', () => {
    expect(normalizeCoverLayout({ scale: 300, x: -150, y: 42 })).toEqual({ scale: 180, x: -100, y: 42 })
    expect(normalizeCoverLayout(null)).toEqual({ scale: 100, x: 0, y: 0 })
  })

  it('replaces malformed layout storage when saving', () => {
    localStorage.setItem(coverLayoutsKey, 'null')
    expect(() => saveCoverLayout('抖音', 1, { scale: 120, x: 10, y: -5 })).not.toThrow()
    expect(localStorage.getItem(coverLayoutsKey)).toContain('抖音-1')
  })
})
