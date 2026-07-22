import { useState, type CSSProperties } from 'react'
import { Check, Download, Image as ImageIcon, Palette, Save } from 'lucide-react'
import productImage from '../../assets/bookmark-gift.png'
import type { ContentPlatform } from '../creation/creation'
import { brandPresetKey, coverSpecs, exportCoverPng, readBrandPreset } from './cover-studio'
import './template-studio.css'

export function TemplateStudio({ defaultTitle, onNotice }: { defaultTitle: string; onNotice: (message: string) => void }) {
  const [preset, setPreset] = useState(readBrandPreset)
  const [platform, setPlatform] = useState<ContentPlatform>('小红书')
  const [template, setTemplate] = useState(0)
  const [title, setTitle] = useState(defaultTitle)
  const [subtitle, setSubtitle] = useState('东方心意 · 日常好礼')
  const [exporting, setExporting] = useState(false)
  const save = () => { localStorage.setItem(brandPresetKey, JSON.stringify(preset)); onNotice('品牌预设已保存在本机') }
  const download = async () => {
    setExporting(true)
    try { await exportCoverPng({ platform, title, subtitle, preset, template, imageUrl: productImage }); onNotice(`${platform}封面 PNG 已导出`) } catch (error) { onNotice(error instanceof Error ? error.message : '封面导出失败') } finally { setExporting(false) }
  }
  return <section className="template-page">
    <header><div><h1>模板与素材</h1><p>保存品牌风格，为小红书和抖音生成可直接使用的竖版封面。</p></div><button className="template-download" onClick={() => void download()} disabled={exporting}><Download/>{exporting ? '正在导出…' : '导出 PNG 封面'}</button></header>
    <div className="template-layout">
      <aside className="preset-editor panel"><div className="panel-title"><span><Palette/>品牌预设</span></div><label>品牌名称<input aria-label="品牌名称" maxLength={40} value={preset.brandName} onChange={event => setPreset({ ...preset, brandName: event.target.value })}/></label><div className="color-row"><label>品牌主色<input aria-label="品牌主色" type="color" value={preset.primaryColor} onChange={event => setPreset({ ...preset, primaryColor: event.target.value })}/></label><label>强调色<input aria-label="强调色" type="color" value={preset.accentColor} onChange={event => setPreset({ ...preset, accentColor: event.target.value })}/></label></div><label>常用话题<textarea aria-label="常用话题" maxLength={300} value={preset.topics} onChange={event => setPreset({ ...preset, topics: event.target.value })}/></label><button className="save-preset" onClick={save}><Save/>保存品牌预设</button><div className="asset-note"><ImageIcon/><div><strong>商品素材</strong><span>当前使用商品库主图；自定义 Logo 与多图管理将在下一增量提供。</span></div></div></aside>
      <section className="cover-workspace panel"><div className="cover-toolbar"><div>{(['小红书', '抖音'] as ContentPlatform[]).map(item => <button key={item} aria-pressed={platform === item} onClick={() => setPlatform(item)}>{item}封面</button>)}</div><span>{coverSpecs[platform].width} × {coverSpecs[platform].height}</span></div><div className="cover-stage"><div className={`cover-preview cover-template-${template}`} style={{ '--brand': preset.primaryColor, '--accent': preset.accentColor, aspectRatio: `${coverSpecs[platform].width}/${coverSpecs[platform].height}` } as CSSProperties}><i/><img src={productImage} alt="商品封面素材"/><h2>{title}</h2><p>{subtitle}</p><small>{preset.brandName}</small></div></div></section>
      <aside className="cover-settings panel"><div className="panel-title">封面设置</div><label>封面标题<textarea aria-label="封面标题" maxLength={40} value={title} onChange={event => setTitle(event.target.value)}/></label><label>副标题<input aria-label="封面副标题" maxLength={30} value={subtitle} onChange={event => setSubtitle(event.target.value)}/></label><div className="template-choices"><button aria-pressed={template === 0} onClick={() => setTemplate(0)}><span className="light-swatch"/>{template === 0 && <Check/>}雅致留白</button><button aria-pressed={template === 1} onClick={() => setTemplate(1)}><span className="dark-swatch" style={{ background: preset.primaryColor }}/>{template === 1 && <Check/>}品牌满版</button></div><div className="topic-preview"><strong>常用话题</strong><p>{preset.topics || '暂未设置常用话题'}</p></div></aside>
    </div>
  </section>
}
