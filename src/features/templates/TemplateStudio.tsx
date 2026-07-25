import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Check, Download, Image as ImageIcon, ImagePlus, Palette, Save } from 'lucide-react'
import productImage from '../../assets/bookmark-gift.png'
import type { ContentPlatform } from '../creation/creation'
import { productsApi, type ProductRecord } from '../products/products.api'
import { brandPresetKey, coverSpecs, exportCoverPng, readBrandPreset, readCoverLayout, saveCoverLayout, type CoverLayout } from './cover-studio'
import './template-studio.css'

export function TemplateStudio({ defaultTitle, onNotice }: { defaultTitle: string; onNotice: (message: string) => void }) {
  const [preset, setPreset] = useState(readBrandPreset)
  const [platform, setPlatform] = useState<ContentPlatform>('小红书')
  const [template, setTemplate] = useState(0)
  const [title, setTitle] = useState(defaultTitle)
  const [subtitle, setSubtitle] = useState('东方心意 · 日常好礼')
  const [exporting, setExporting] = useState(false)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [imageUrl, setImageUrl] = useState(productImage)
  const [layout, setLayout] = useState(() => readCoverLayout('小红书', 0))
  const assets = useMemo(() => products.flatMap(product => (product.assets ?? []).map(asset => ({ ...asset, productName: product.name, url: `/uploads/${asset.storedName}` }))), [products])
  useEffect(() => { productsApi.list().then(response => { setProducts(response.data); setSelectedProductId(response.data[0]?.id ?? '') }).catch(error => onNotice(error instanceof Error ? error.message : '素材加载失败')) }, [onNotice])
  const save = () => { localStorage.setItem(brandPresetKey, JSON.stringify(preset)); onNotice('品牌预设已保存在本机') }
  const changeLayout = (change: Partial<CoverLayout>) => { const next = { ...layout, ...change }; setLayout(next); saveCoverLayout(platform, template, next) }
  const selectPlatform = (next: ContentPlatform) => { setPlatform(next); setLayout(readCoverLayout(next, template)) }
  const selectTemplate = (next: number) => { setTemplate(next); setLayout(readCoverLayout(platform, next)) }
  const upload = async (file?: File) => {
    if (!file || !selectedProductId) return onNotice('请先选择要关联的商品')
    try { const response = await productsApi.upload(selectedProductId, file); setImageUrl(response.data.url); setProducts((await productsApi.list()).data); onNotice('素材已上传并选为当前主图') } catch (error) { onNotice(error instanceof Error ? error.message : '素材上传失败') }
  }
  const download = async () => {
    setExporting(true)
    try { await exportCoverPng({ platform, title, subtitle, preset, template, imageUrl, layout }); onNotice(`${platform}封面 PNG 已导出`) } catch (error) { onNotice(error instanceof Error ? error.message : '封面导出失败') } finally { setExporting(false) }
  }
  return <section className="template-page">
    <header><div><h1>模板与素材</h1><p>保存品牌风格，为小红书和抖音生成可直接使用的竖版封面。</p></div><button className="template-download" onClick={() => void download()} disabled={exporting}><Download/>{exporting ? '正在导出…' : '导出 PNG 封面'}</button></header>
    <div className="template-layout">
      <aside className="preset-editor panel"><div className="panel-title"><span><Palette/>品牌预设</span></div><label>品牌名称<input aria-label="品牌名称" maxLength={40} value={preset.brandName} onChange={event => setPreset({ ...preset, brandName: event.target.value })}/></label><div className="color-row"><label>品牌主色<input aria-label="品牌主色" type="color" value={preset.primaryColor} onChange={event => setPreset({ ...preset, primaryColor: event.target.value })}/></label><label>强调色<input aria-label="强调色" type="color" value={preset.accentColor} onChange={event => setPreset({ ...preset, accentColor: event.target.value })}/></label></div><label>常用话题<textarea aria-label="常用话题" maxLength={300} value={preset.topics} onChange={event => setPreset({ ...preset, topics: event.target.value })}/></label><button className="save-preset" onClick={save}><Save/>保存品牌预设</button><div className="material-library"><strong><ImageIcon/>商品素材</strong><div className="asset-grid">{assets.length ? assets.map(asset => <button aria-label={`选择素材 ${asset.filename}`} aria-pressed={imageUrl === asset.url} key={asset.id} onClick={() => setImageUrl(asset.url)}><img src={asset.url} alt=""/><span>{asset.productName}</span></button>) : <p>商品库暂无上传图片</p>}</div><select aria-label="素材关联商品" value={selectedProductId} onChange={event => setSelectedProductId(event.target.value)}><option value="">选择关联商品</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select><label className="upload-material"><ImagePlus/>上传新素材<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void upload(event.target.files?.[0])}/></label></div></aside>
      <section className="cover-workspace panel"><div className="cover-toolbar"><div>{(['小红书', '抖音'] as ContentPlatform[]).map(item => <button key={item} aria-pressed={platform === item} onClick={() => selectPlatform(item)}>{item}封面</button>)}</div><span>{coverSpecs[platform].width} × {coverSpecs[platform].height}</span></div><div className="cover-stage"><div className={`cover-preview cover-template-${template}`} style={{ '--brand': preset.primaryColor, '--accent': preset.accentColor, aspectRatio: `${coverSpecs[platform].width}/${coverSpecs[platform].height}` } as CSSProperties}><i/><img src={imageUrl} alt="当前封面素材" style={{ transform: `translate(${layout.x / 4}%, ${layout.y / 4}%) scale(${layout.scale / 100})` }}/><div className={`safe-area ${platform === '抖音' ? 'douyin' : 'xiaohongshu'}`} aria-label={`${platform}安全区域`}/><h2>{title}</h2><p>{subtitle}</p><small>{preset.brandName}</small></div></div></section>
      <aside className="cover-settings panel"><div className="panel-title">封面设置</div><label>封面标题<textarea aria-label="封面标题" maxLength={40} value={title} onChange={event => setTitle(event.target.value)}/></label><label>副标题<input aria-label="封面副标题" maxLength={30} value={subtitle} onChange={event => setSubtitle(event.target.value)}/></label><div className="template-choices"><button aria-pressed={template === 0} onClick={() => selectTemplate(0)}><span className="light-swatch"/>{template === 0 && <Check/>}雅致留白</button><button aria-pressed={template === 1} onClick={() => selectTemplate(1)}><span className="dark-swatch" style={{ background: preset.primaryColor }}/>{template === 1 && <Check/>}品牌满版</button></div><div className="crop-controls"><label>素材缩放 <output>{layout.scale}%</output><input aria-label="素材缩放" type="range" min="60" max="180" value={layout.scale} onChange={event => changeLayout({ scale: Number(event.target.value) })}/></label><label>水平位置 <output>{layout.x}</output><input aria-label="素材水平位置" type="range" min="-100" max="100" value={layout.x} onChange={event => changeLayout({ x: Number(event.target.value) })}/></label><label>垂直位置 <output>{layout.y}</output><input aria-label="素材垂直位置" type="range" min="-100" max="100" value={layout.y} onChange={event => changeLayout({ y: Number(event.target.value) })}/></label><small>虚线框为{platform}界面安全区域</small></div><div className="topic-preview"><strong>常用话题</strong><p>{preset.topics || '暂未设置常用话题'}</p></div></aside>
    </div>
  </section>
}
