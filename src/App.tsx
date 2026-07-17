import { useMemo, useState, type ReactNode } from 'react'
import { Archive, Box, Check, ChevronDown, CircleHelp, Download, FileImage, Home, Image, Lock, RefreshCw, Settings, Sparkles, TriangleAlert } from 'lucide-react'
import productImage from './assets/bookmark-gift.png'
import { checkCompliance, generateMockContent } from './features/creation/creation'
import { mockProduct } from './features/products/mockProducts'
import { ProductLibrary } from './features/products/ProductLibrary'
import type { ProductRecord } from './features/products/products.api'

const nav = [[Home, '今日工作台'], [Box, '商品库'], [Archive, '创作任务'], [Image, '模板与素材'], [Settings, '设置']] as const
const exportOptions = ['主图 800×800', '详情页长图 750px', '竖版海报 3:4']

export function App() {
  const [currentProduct, setCurrentProduct] = useState<ProductRecord | typeof mockProduct>(mockProduct)
  const [variant, setVariant] = useState(0)
  const [content, setContent] = useState(() => generateMockContent(mockProduct.id, 0))
  const [generating, setGenerating] = useState(false)
  const [exported, setExported] = useState(false)
  const [selectedNav, setSelectedNav] = useState('今日工作台')
  const [selectedExport, setSelectedExport] = useState(exportOptions[0])
  const [zoom, setZoom] = useState(50)
  const [template, setTemplate] = useState(0)
  const [locked, setLocked] = useState(false)
  const [notice, setNotice] = useState('')
  const findings = useMemo(() => checkCompliance(`${content.title} ${content.sellingPoints.join(' ')}`), [content])

  const generate = () => {
    setGenerating(true)
    window.setTimeout(() => {
      const next = variant + 1
      setVariant(next)
      setContent(generateMockContent(currentProduct.id, next, currentProduct.name))
      setGenerating(false)
      setNotice('已生成一组新的模拟文案')
    }, 650)
  }

  const exportBundle = () => {
    const copy = `${content.title}\n\n${content.sellingPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}\n\n商品：${currentProduct.name}`
    const url = URL.createObjectURL(new Blob([copy], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '东方花窗书签礼盒-文案.txt'
    anchor.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setNotice(`${selectedExport}文案包已导出`)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="seal">造</span><strong>造物台</strong></div>
      <nav aria-label="主导航">{nav.map(([Icon, label]) => <button className={selectedNav === label ? 'active' : ''} key={label} onClick={() => { if (label === '今日工作台' || label === '商品库') setSelectedNav(label); setNotice(label === '今日工作台' ? '已返回今日工作台' : label === '商品库' ? '' : `${label}将在下一版本开放`) }}><Icon size={20}/><span>{label}</span></button>)}</nav>
      <div className="side-note">个人模式<br/><small>数据保存在本机</small></div>
    </aside>

    <main>
      <header className="topbar"><div/><button onClick={() => setNotice('可直接编辑文案；生成与导出目前使用模拟数据')}><CircleHelp size={17}/>使用帮助</button><span className="avatar">山</span></header>
      {selectedNav === '商品库' ? <ProductLibrary onUse={product => { setCurrentProduct(product); setContent(generateMockContent(product.id, 0, product.name)); setVariant(0); setSelectedNav('今日工作台'); setNotice(`已选择“${product.name}”用于创作`) }}/> : <>
      <section className="page-head">
        <div><h1>七夕礼赠创作任务</h1><div className="steps"><span className="done"><Check/>选择商品</span><i/><span className="current">2</span><b>生成内容</b><i/><span>3</span><b>审核调整</b><i/><span>4</span><b>导出完成</b></div></div>
        <div className="head-actions"><div className="task-state">任务状态：<em>{generating ? '内容生成中' : exported ? '已导出' : '待编辑'}</em></div><button className="primary" onClick={generate} disabled={generating}><Sparkles size={18}/>{generating ? '正在生成…' : '生成内容'}</button><button className="secondary" onClick={exportBundle}><Download size={18}/>导出素材包</button></div>
      </section>

      <section className="workspace">
        <aside className="product-panel panel">
          <div className="panel-title">商品信息 <ChevronDown size={16}/></div>
          <div className="product-summary"><img src={'assets' in currentProduct && currentProduct.assets?.[0]?.storedName ? `/uploads/${currentProduct.assets[0].storedName}` : productImage} alt={currentProduct.name}/><div><strong>{currentProduct.name}</strong><b>¥{currentProduct.price.toFixed(2)}</b><small>材质：{currentProduct.material || '未填写'}</small></div></div>
          <div className="divider"/><h3>产品卖点与信息</h3>
          <Field label="材质" value={currentProduct.material || '未填写'}/><Field label="受众人群" value={currentProduct.audience || '未填写'}/><Field label="适用场景" value={currentProduct.scene || '未填写'}/><Field label="商品类目" value={currentProduct.category}/><Field label="价格" value={`${currentProduct.price.toFixed(2)} 元`}/>
          <button className="soft" onClick={() => setNotice('模拟商品信息已刷新')}><RefreshCw size={15}/>更新商品信息</button>
        </aside>

        <section className="canvas-panel panel">
          <div className="panel-title"><span>主图画布 <small>800×800</small></span><button onClick={() => { setTemplate(value => (value + 1) % 2); setNotice('已切换主图模板') }}>更换模板</button></div>
          <div className={`artboard template-${template}`}><img src={productImage} alt="主图预览"/><div className="art-title">{template === 0 ? <>花窗<br/>映心意</> : <>东方<br/>书香礼</>}</div><span className="art-tag">七夕礼赠</span><div className="art-footer"><b>花窗雅韵</b><span>胡桃木配黄铜</span><span>心意伴手礼</span></div></div>
          <div className="canvas-tools"><button aria-label="缩小画布" onClick={() => setZoom(value => Math.max(30, value - 10))}>−</button><span>{zoom}%</span><button aria-label="放大画布" onClick={() => setZoom(value => Math.min(100, value + 10))}>＋</button><button onClick={() => { setZoom(50); setNotice('画布已适应可视区域') }}>适应画布</button></div>
        </section>

        <aside className="editor-panel">
          <section className="panel copy-panel"><div className="panel-title">文案内容 <button className="plain-action" onClick={() => setLocked(value => !value)}><Lock size={14}/>{locked ? '全部解锁' : '全部锁定'}</button></div>
            <label>生成标题 <small>{content.title.length}/30</small></label><div className="editable"><input aria-label="生成标题" disabled={locked} value={content.title} onChange={event => setContent({...content, title:event.target.value})}/><Lock size={15}/></div>
            <button className="regen" onClick={generate}><RefreshCw size={14}/>重新生成</button>
            <label>产品卖点 <small>3/3</small></label>{content.sellingPoints.map((point, index) => <div className="editable point" key={index}><i>{index + 1}</i><input aria-label={`产品卖点 ${index + 1}`} disabled={locked} value={point} onChange={event => { const points=[...content.sellingPoints]; points[index]=event.target.value; setContent({...content,sellingPoints:points})}}/><Lock size={15}/></div>)}
          </section>
          <section className="panel compliance"><div className="panel-title">合规检测 <button onClick={() => setNotice('合规检测已更新')}><RefreshCw size={14}/>重新检测</button></div>{findings.map((finding, index) => <div className={finding.level} key={index}>{finding.level === 'warning' ? <TriangleAlert/> : <Check/>}<span>{finding.message}</span>{finding.level === 'warning' && <button onClick={() => { setContent({...content,title:content.title.replaceAll('限量','限定'),sellingPoints:content.sellingPoints.map(point=>point.replaceAll('限量','限定'))}); setNotice('风险表达已替换为“限定”') }}>去修改</button>}</div>)}</section>
        </aside>
      </section>

      <footer className="export-bar"><strong>导出规格</strong>{exportOptions.map(title => <ExportOption key={title} icon={<FileImage/>} title={title} selected={selectedExport === title} onSelect={() => setSelectedExport(title)}/>)}<div className="export-status"><small>导出状态</small><b>{exported ? '已完成 3/3' : '准备就绪 0/3'}</b><div><span className={exported ? 'complete' : ''}/></div></div></footer>
      </>}
      {notice && <div className="toast" role="status"><Check size={16}/>{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
    </main>
  </div>
}

function Field({label,value}:{label:string,value:string}) { return <label className="field"><span>{label}</span><div>{value}<Lock size={13}/></div></label> }
function ExportOption({icon,title,selected,onSelect}:{icon:ReactNode,title:string,selected?:boolean,onSelect:()=>void}) { return <button aria-pressed={selected} onClick={onSelect} className={`export-option ${selected?'selected':''}`}>{icon}<span><b>{title}</b><small>JPG · 自动适配</small></span>{selected&&<Check/>}</button> }
