import type { ContentPlatform } from '../creation/creation'

export type BrandPreset = { brandName: string; primaryColor: string; accentColor: string; topics: string }
export type CoverLayout = { scale: number; x: number; y: number }
export const brandPresetKey = 'zaowutai.brand-preset'
export const coverLayoutsKey = 'zaowutai.cover-layouts'
export const defaultBrandPreset: BrandPreset = { brandName: '造物台', primaryColor: '#8f2f24', accentColor: '#d8b56a', topics: '#送礼灵感 #东方美学 #实用礼物' }
export const coverSpecs: Record<ContentPlatform, { width: number; height: number; label: string }> = {
  小红书: { width: 1080, height: 1440, label: '3:4 竖版封面' },
  抖音: { width: 1080, height: 1920, label: '9:16 视频封面' },
}

export function readBrandPreset(): BrandPreset {
  try {
    const value = JSON.parse(localStorage.getItem(brandPresetKey) ?? 'null') as Partial<BrandPreset> | null
    if (!value || typeof value.brandName !== 'string' || typeof value.primaryColor !== 'string' || typeof value.accentColor !== 'string' || typeof value.topics !== 'string') return defaultBrandPreset
    const color = /^#[0-9a-f]{6}$/i
    return { brandName: value.brandName.slice(0, 40), primaryColor: color.test(value.primaryColor) ? value.primaryColor : defaultBrandPreset.primaryColor, accentColor: color.test(value.accentColor) ? value.accentColor : defaultBrandPreset.accentColor, topics: value.topics.slice(0, 300) }
  } catch { return defaultBrandPreset }
}

export function safeCoverFilename(title: string) {
  return title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/-+/g, '-').replace(/^[. -]+|[. -]+$/g, '').slice(0, 60) || '平台封面'
}

export function normalizeCoverLayout(value: Partial<CoverLayout> | null | undefined): CoverLayout {
  const clamp = (input: unknown, min: number, max: number, fallback: number) => typeof input === 'number' && Number.isFinite(input) ? Math.min(max, Math.max(min, input)) : fallback
  return { scale: clamp(value?.scale, 60, 180, 100), x: clamp(value?.x, -100, 100, 0), y: clamp(value?.y, -100, 100, 0) }
}

export function readCoverLayout(platform: ContentPlatform, template: number) {
  try {
    const layouts = JSON.parse(localStorage.getItem(coverLayoutsKey) ?? '{}') as Record<string, Partial<CoverLayout>>
    return normalizeCoverLayout(layouts[`${platform}-${template}`])
  } catch { return normalizeCoverLayout(null) }
}

export function saveCoverLayout(platform: ContentPlatform, template: number, layout: CoverLayout) {
  let layouts: Record<string, CoverLayout> = {}
  try {
    const parsed = JSON.parse(localStorage.getItem(coverLayoutsKey) ?? '{}') as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) layouts = parsed as Record<string, CoverLayout>
  } catch { /* replace malformed local state */ }
  layouts[`${platform}-${template}`] = normalizeCoverLayout(layout)
  localStorage.setItem(coverLayoutsKey, JSON.stringify(layouts))
}

export async function exportCoverPng(options: { platform: ContentPlatform; title: string; subtitle: string; preset: BrandPreset; template: number; imageUrl: string; layout: CoverLayout }) {
  const spec = coverSpecs[options.platform]
  const canvas = document.createElement('canvas'); canvas.width = spec.width; canvas.height = spec.height
  const context = canvas.getContext('2d'); if (!context) throw new Error('当前浏览器不支持封面导出')
  context.fillStyle = options.template === 0 ? '#f4efe7' : options.preset.primaryColor; context.fillRect(0, 0, spec.width, spec.height)
  context.fillStyle = options.preset.accentColor; context.fillRect(72, 70, 10, spec.height - 140)
  const image = new Image(); image.src = options.imageUrl; await image.decode()
  const boxSize = Math.min(spec.width * .72, spec.height * .44) * options.layout.scale / 100
  const ratio = image.naturalWidth / image.naturalHeight
  const imageWidth = ratio >= 1 ? boxSize : boxSize * ratio
  const imageHeight = ratio >= 1 ? boxSize / ratio : boxSize
  const imageX = (spec.width - imageWidth) / 2 + options.layout.x / 100 * spec.width * .25
  const imageY = spec.height * .16 + (boxSize - imageHeight) / 2 + options.layout.y / 100 * spec.height * .12
  context.drawImage(image, imageX, imageY, imageWidth, imageHeight)
  context.textAlign = 'center'; context.fillStyle = options.template === 0 ? options.preset.primaryColor : '#fff'; context.font = 'bold 76px Microsoft YaHei'
  drawWrappedText(context, options.title, spec.width / 2, spec.height * .68, spec.width - 180, 98)
  context.font = '34px Microsoft YaHei'; context.fillStyle = options.template === 0 ? '#655a50' : '#f3e7d2'; context.fillText(options.subtitle.slice(0, 30), spec.width / 2, spec.height * .87)
  context.font = '28px Microsoft YaHei'; context.fillText(options.preset.brandName, spec.width / 2, spec.height - 70)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('封面生成失败')), 'image/png'))
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${options.platform}-${safeCoverFilename(options.title)}.png`; anchor.click(); URL.revokeObjectURL(url)
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const lines: string[] = []; let line = ''
  for (const character of Array.from(text.slice(0, 40))) { const next = line + character; if (context.measureText(next).width > maxWidth && line) { lines.push(line); line = character } else line = next }
  if (line) lines.push(line)
  lines.slice(0, 3).forEach((value, index) => context.fillText(value, x, y + index * lineHeight))
}
