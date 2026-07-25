import type { PerformanceDraft } from './performance.api'

type ImportField = Exclude<keyof PerformanceDraft, 'publishingTaskId'>
type CountField = 'impressions' | 'views' | 'likes' | 'favorites' | 'comments' | 'shares' | 'leads' | 'orders'
export type CsvImportError = { row: number; message: string }

const fieldAliases: Record<ImportField, string[]> = {
  platform: ['平台', 'platform'],
  productName: ['商品名称', '商品', 'productname', 'product'],
  title: ['作品标题', '标题', 'title'],
  recordedOn: ['统计日期', '日期', 'recordedon', 'date'],
  impressions: ['曝光量', '曝光', 'impressions'],
  views: ['播放阅读', '播放量', '阅读量', 'views'],
  likes: ['点赞', '点赞量', 'likes'],
  favorites: ['收藏', '收藏量', 'favorites'],
  comments: ['评论', '评论量', 'comments'],
  shares: ['分享', '分享量', 'shares'],
  leads: ['线索', '线索量', 'leads'],
  orders: ['订单', '订单量', 'orders'],
  revenue: ['成交额', '销售额', 'revenue'],
}
const fieldLabels: Record<ImportField, string> = {
  platform: '平台', productName: '商品名称', title: '作品标题', recordedOn: '统计日期',
  impressions: '曝光量', views: '播放阅读', likes: '点赞', favorites: '收藏',
  comments: '评论', shares: '分享', leads: '线索', orders: '订单', revenue: '成交额',
}
const countFields: CountField[] = ['impressions', 'views', 'likes', 'favorites', 'comments', 'shares', 'leads', 'orders']
const numericFields: Array<CountField | 'revenue'> = [...countFields, 'revenue']
const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[\s_./-]/g, '')

export const performanceCsvTemplate = [
  '平台,商品名称,作品标题,统计日期,曝光量,播放阅读,点赞,收藏,评论,分享,线索,订单,成交额',
  '小红书,示例商品,示例作品标题,2026-07-25,12000,8000,620,310,48,32,20,6,588.50',
].join('\r\n')

function parseRows(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index++ }
      else if (character === '"') quoted = false
      else field += character
    } else if (character === '"' && field === '') quoted = true
    else if (character === ',') { row.push(field); field = '' }
    else if (character === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (character !== '\r') field += character
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return { rows: rows.filter(values => values.some(value => value.trim())), unclosedQuote: quoted }
}

function normalizeDate(value: string) {
  const match = value.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function normalizePlatform(value: string): PerformanceDraft['platform'] | null {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('小红书') || normalized === 'xiaohongshu' || normalized === 'rednote') return '小红书'
  if (normalized.includes('抖音') || normalized === 'douyin' || normalized === 'tiktok') return '抖音'
  return null
}

function parseNumber(value: string) {
  const normalized = value.trim().replace(/[,\s¥￥]/g, '')
  if (!normalized) return null
  const number = Number(normalized)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function parsePerformanceCsv(text: string) {
  const { rows, unclosedQuote } = parseRows(text.replace(/^\uFEFF/, ''))
  const errors: CsvImportError[] = []
  if (unclosedQuote) errors.push({ row: rows.length + 1, message: '存在未闭合的引号' })
  if (!rows.length) return { records: [] as PerformanceDraft[], errors: [{ row: 1, message: 'CSV 文件为空' }] }
  if (rows.length - 1 > 1000) return { records: [] as PerformanceDraft[], errors: [{ row: 1, message: '单次最多导入 1000 条数据' }] }

  const normalizedHeaders = rows[0].map(normalizeHeader)
  const columns = {} as Record<ImportField, number>
  for (const [field, aliases] of Object.entries(fieldAliases) as Array<[ImportField, string[]]>) {
    columns[field] = normalizedHeaders.findIndex(header => aliases.map(normalizeHeader).includes(header))
    if (columns[field] < 0) errors.push({ row: 1, message: `缺少必填列：${fieldLabels[field]}` })
  }
  if (errors.some(error => error.row === 1)) return { records: [] as PerformanceDraft[], errors }

  const candidates: PerformanceDraft[] = []
  rows.slice(1).forEach((values, offset) => {
    const rowNumber = offset + 2
    const value = (field: ImportField) => values[columns[field]]?.trim() ?? ''
    const platform = normalizePlatform(value('platform'))
    const recordedOn = normalizeDate(value('recordedOn'))
    if (!platform) errors.push({ row: rowNumber, message: '平台必须是小红书或抖音' })
    if (!value('productName')) errors.push({ row: rowNumber, message: '商品名称不能为空' })
    if (!value('title')) errors.push({ row: rowNumber, message: '作品标题不能为空' })
    if (!recordedOn) errors.push({ row: rowNumber, message: '统计日期格式无效，应为 YYYY-MM-DD' })
    const numbers = {} as Record<CountField | 'revenue', number>
    for (const field of numericFields) {
      const parsed = parseNumber(value(field))
      if (parsed === null || (field !== 'revenue' && !Number.isInteger(parsed))) errors.push({ row: rowNumber, message: `${fieldLabels[field]}必须是${field === 'revenue' ? '非负数字' : '非负整数'}` })
      else numbers[field] = parsed
    }
    if (platform && recordedOn && value('productName') && value('title') && numericFields.every(field => numbers[field] !== undefined)) {
      candidates.push({ publishingTaskId: null, platform, productName: value('productName'), title: value('title'), recordedOn, ...numbers })
    }
  })
  return { records: errors.length ? [] : candidates, errors }
}
