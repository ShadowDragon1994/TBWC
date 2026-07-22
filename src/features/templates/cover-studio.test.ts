import { describe, expect, it } from 'vitest'
import { coverSpecs, readBrandPreset, safeCoverFilename } from './cover-studio'

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
})
