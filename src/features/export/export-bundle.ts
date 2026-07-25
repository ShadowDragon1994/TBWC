import JSZip from 'jszip'
import type { ContentPlatform } from '../creation/creation'
import { canExport, type ComplianceFinding } from '../compliance/compliance'

export type ExportImageSpec = { filename: string; width: number; height: number; label: string }
export const exportImageSpecs: ExportImageSpec[] = [
  { filename: 'main-800.png', width: 800, height: 800, label: '电商主图' },
  { filename: 'xiaohongshu-3x4.png', width: 1080, height: 1440, label: '小红书 3:4 封面' },
  { filename: 'douyin-9x16.png', width: 1080, height: 1920, label: '抖音 9:16 封面' },
]

export type ExportBundleInput = {
  productName: string
  platform: ContentPlatform
  title: string
  sellingPoints: string[]
  body: string
  imageUrl: string
  findings: ComplianceFinding[]
}

export type ImageRenderer = (spec: ExportImageSpec, input: ExportBundleInput) => Promise<Blob>

export async function buildExportBundle(input: ExportBundleInput, render: ImageRenderer = renderExportImage) {
  if (!canExport(input.findings)) throw new Error('合规检查尚未处理完成，请先修改阻断项并确认提示项')
  const zip = new JSZip()
  const images = zip.folder('images')
  for (const spec of exportImageSpecs) {
    const blob = await render(spec, input)
    images?.file(spec.filename, new Uint8Array(await blob.arrayBuffer()))
  }
  const exportedAt = new Date().toISOString()
  zip.file('content.txt', `商品：${input.productName}\n平台：${input.platform}\n标题：${input.title}\n\n卖点：\n${input.sellingPoints.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n正文：\n${input.body}\n`)
  zip.file('compliance-report.json', JSON.stringify({ checkedAt: exportedAt, findings: input.findings }, null, 2))
  zip.file('manifest.json', JSON.stringify({
    version: 1,
    exportedAt,
    productName: input.productName,
    platform: input.platform,
    files: exportImageSpecs.map(spec => ({ path: `images/${spec.filename}`, width: spec.width, height: spec.height, label: spec.label })),
  }, null, 2))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

export async function downloadExportBundle(input: ExportBundleInput) {
  const bytes = await buildExportBundle(input)
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `zaowutai-${safeFilename(input.productName)}-${new Date().toISOString().slice(0, 10)}.zip`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function renderExportImage(spec: ExportImageSpec, input: ExportBundleInput) {
  const canvas = document.createElement('canvas')
  canvas.width = spec.width
  canvas.height = spec.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器不支持图片导出')
  context.fillStyle = '#f3ede3'
  context.fillRect(0, 0, spec.width, spec.height)
  const image = new Image()
  image.src = input.imageUrl
  await image.decode()
  const maxWidth = spec.width * .8
  const maxHeight = spec.height * .58
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  context.drawImage(image, (spec.width - width) / 2, spec.height * .08, width, height)
  const footerTop = spec.height * .68
  context.fillStyle = '#342b26'
  context.fillRect(0, footerTop, spec.width, spec.height - footerTop)
  context.textAlign = 'center'
  context.fillStyle = '#fff8ed'
  context.font = `bold ${Math.round(spec.width * .065)}px Microsoft YaHei`
  drawWrappedText(context, input.title, spec.width / 2, footerTop + spec.height * .09, spec.width * .82, spec.width * .085)
  context.fillStyle = '#d9b66f'
  context.font = `${Math.round(spec.width * .027)}px Microsoft YaHei`
  context.fillText(input.sellingPoints[0]?.slice(0, 32) || input.productName, spec.width / 2, spec.height * .92)
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 图片生成失败')), 'image/png'))
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const lines: string[] = []
  let line = ''
  for (const character of Array.from(text.slice(0, 50))) {
    const next = line + character
    if (line && context.measureText(next).width > maxWidth) { lines.push(line); line = character } else line = next
  }
  if (line) lines.push(line)
  lines.slice(0, 3).forEach((value, index) => context.fillText(value, x, y + index * lineHeight))
}

function safeFilename(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/-+/g, '-').slice(0, 50) || 'export'
}

