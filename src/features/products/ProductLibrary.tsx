import { useCallback, useEffect, useState } from 'react'
import { Copy, Download, ImagePlus, PackagePlus, Pencil, Plus, Rocket, Save, Search, Trash2, Upload } from 'lucide-react'
import { productsApi, type ProductDraft, type ProductRecord, type SourcingOffer } from './products.api'
import fallbackImage from '../../assets/bookmark-gift.png'
import './product-library.css'

const emptyDraft: ProductDraft = { name: '', category: '文创礼品', price: 0, cost: null, material: '', size: '', color: '', audience: '', scene: '', sellingPoints: '', forbiddenTerms: '', supplier: '', supplierUrl: '' }

export function ProductLibrary({ onUse }: { onUse: (product: ProductRecord) => void }) {
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [editing, setEditing] = useState<ProductRecord | null>(null)
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [listingId, setListingId] = useState<string | null>(null)
  const [sourcingOpen, setSourcingOpen] = useState(false)
  const [sourcingOffers, setSourcingOffers] = useState<SourcingOffer[]>([])
  const [sourcingQuery, setSourcingQuery] = useState('')
  const [importingId, setImportingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { setProducts((await productsApi.list()).data) } catch (error) { setMessage(error instanceof Error ? error.message : '加载失败') }
  }, [])
  useEffect(() => { void load() }, [load])

  const edit = (product?: ProductRecord) => {
    setDialogOpen(true)
    setEditing(product ?? null)
    setDraft(product ? { name:product.name, category:product.category, price:product.price, cost:product.cost, material:product.material, size:product.size, color:product.color, audience:product.audience, scene:product.scene, sellingPoints:product.sellingPoints, forbiddenTerms:product.forbiddenTerms, supplier:product.supplier, supplierUrl:product.supplierUrl } : emptyDraft)
  }
  const save = async () => {
    setBusy(true)
    try {
      if (editing) await productsApi.update(editing.id, draft)
      else await productsApi.create(draft)
      setMessage(editing ? '商品修改已保存' : '商品已保存到本机')
      setEditing(null); setDraft(emptyDraft); setDialogOpen(false); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败') } finally { setBusy(false) }
  }
  const duplicate = async (product: ProductRecord) => {
    await productsApi.create({ ...product, name: `${product.name} 副本` }); setMessage('已复制商品'); await load()
  }
  const remove = async (product: ProductRecord) => {
    if (!window.confirm(`确定删除“${product.name}”吗？`)) return
    await productsApi.remove(product.id); setMessage('商品已删除'); await load()
  }
  const uploadImage = async (product: ProductRecord, file?: File) => {
    if (!file) return
    try { await productsApi.upload(product.id, file); setMessage('商品图片已上传'); await load() } catch (error) { setMessage(error instanceof Error ? error.message : '上传失败') }
  }
  const listOnTaobao = async (product: ProductRecord) => {
    setListingId(product.id)
    try {
      const result = await productsApi.listOnTaobao(product.id)
      setMessage(`淘宝上架任务已提交并写入审计：${result.data.externalUrl || result.data.id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '淘宝上架任务失败')
    } finally {
      setListingId(null)
    }
  }
  const searchSourcing = async () => {
    try { const result = await productsApi.sourcing1688(sourcingQuery); setSourcingOffers(result.data); setSourcingOpen(true) }
    catch (error) { setMessage(error instanceof Error ? error.message : '1688模拟货源加载失败') }
  }
  const importSourcing = async (offer: SourcingOffer) => {
    setImportingId(offer.id)
    try { await productsApi.import1688(offer.id); setMessage(`已从1688模拟货源导入：${offer.title}`); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : '货源导入失败') }
    finally { setImportingId(null) }
  }
  const downloadBackup = async () => {
    try { const backup = await productsApi.backupArchive(); const url = URL.createObjectURL(backup); const anchor = document.createElement('a'); anchor.href=url; anchor.download=`zaowutai-backup-${new Date().toISOString().slice(0,10)}.zip`; anchor.click(); URL.revokeObjectURL(url); setMessage('完整备份已导出（包含商品图片）') } catch (error) { setMessage(error instanceof Error ? error.message : '完整备份导出失败') }
  }
  const restoreBackup = async (file?: File) => {
    if (!file) return
    try { await productsApi.restoreArchive(file); setMessage('完整备份已恢复（包含商品图片）'); await load() } catch (error) { setMessage(error instanceof Error ? error.message : 'ZIP 备份文件无效') }
  }
  const visible = products.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase()))

  return <section className="library-page">
    <div className="library-head"><div><h1>商品库</h1><p>商品资料和图片保存在这台电脑上。</p></div><div className="library-actions"><button onClick={() => void searchSourcing()}><PackagePlus size={16}/>1688模拟货源</button><button onClick={() => void downloadBackup()}><Download size={16}/>导出完整备份</button><label className="button"><Upload size={16}/>恢复完整备份<input type="file" accept="application/zip,.zip" onChange={event => void restoreBackup(event.target.files?.[0])}/></label><button className="primary" onClick={() => edit()}><Plus size={17}/>新增商品</button></div></div>
    <div className="library-toolbar"><label><Search size={17}/><input aria-label="搜索商品" placeholder="搜索商品名称或类目" value={query} onChange={event => setQuery(event.target.value)}/></label><span>共 {products.length} 个商品</span></div>
    {message && <div className="library-message" role="status">{message}<button onClick={() => setMessage('')}>×</button></div>}
    {visible.length === 0 ? <div className="empty-products"><PackagePlus size={38}/><h2>还没有商品</h2><p>创建第一个商品，资料会写入本地 SQLite。</p><button className="primary" onClick={() => edit()}>新增商品</button></div> : <div className="product-grid">{visible.map(product => {
      const image = product.assets?.[0]?.storedName ? `/uploads/${product.assets[0].storedName}` : fallbackImage
      return <article className="product-card" key={product.id}><img src={image} alt=""/><div className="product-card-body"><small>{product.category}</small><h2>{product.name}</h2><b>¥{product.price.toFixed(2)}</b><p>{product.material || '未填写材质'} · {product.scene || '未填写场景'}</p><div className="card-actions"><button onClick={() => onUse(product)}>用于创作</button><button disabled={listingId === product.id} onClick={() => void listOnTaobao(product)}><Rocket/>{listingId === product.id ? '提交中…' : '一键上架淘宝'}</button><button aria-label="编辑商品" onClick={() => edit(product)}><Pencil/></button><button aria-label="复制商品" onClick={() => void duplicate(product)}><Copy/></button><label aria-label="上传商品图片"><ImagePlus/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadImage(product,event.target.files?.[0])}/></label><button aria-label="删除商品" onClick={() => void remove(product)}><Trash2/></button></div></div></article>
    })}</div>}
    {sourcingOpen && <div className="product-dialog-backdrop" role="presentation"><section className="product-dialog sourcing-dialog" role="dialog" aria-modal="true" aria-label="1688模拟货源"><header><div><h2>1688模拟货源</h2><p>当前使用可替换的模拟供应商适配器，导入记录会写入自动化审计。</p></div><button onClick={() => setSourcingOpen(false)}>×</button></header><div className="sourcing-search"><input aria-label="搜索1688模拟货源" value={sourcingQuery} onChange={event => setSourcingQuery(event.target.value)} placeholder="搜索品名、场景或材质"/><button onClick={() => void searchSourcing()}><Search size={16}/>搜索</button></div><div className="sourcing-list">{sourcingOffers.length === 0 ? <p>没有匹配的模拟货源</p> : sourcingOffers.map(offer => <article key={offer.id}><div><small>{offer.category} · 起订 {offer.minOrder} 件</small><h3>{offer.title}</h3><p>{offer.sellingPoints}</p><span>供货价 ¥{offer.wholesalePrice.toFixed(2)} · 建议零售价 ¥{offer.suggestedRetailPrice.toFixed(2)}</span></div><button disabled={importingId === offer.id} onClick={() => void importSourcing(offer)}>{importingId === offer.id ? '导入中…' : '导入商品库'}</button></article>)}</div></section></div>}
    {dialogOpen && <div className="product-dialog-backdrop" role="presentation"><section className="product-dialog" role="dialog" aria-modal="true" aria-label={editing ? '编辑商品' : '新增商品'}><header><div><h2>{editing ? '编辑商品' : '新增商品'}</h2><p>带 * 的字段必须填写</p></div><button onClick={() => { setDialogOpen(false); setEditing(null); setDraft(emptyDraft) }}>×</button></header><div className="product-form"><Input label="商品名称 *" value={draft.name} onChange={name=>setDraft({...draft,name})}/><Input label="商品类目 *" value={draft.category} onChange={category=>setDraft({...draft,category})}/><Input label="售价 *" type="number" value={String(draft.price)} onChange={price=>setDraft({...draft,price:Number(price)})}/><Input label="成本" type="number" value={String(draft.cost ?? '')} onChange={cost=>setDraft({...draft,cost:cost===''?null:Number(cost)})}/><Input label="材质" value={draft.material ?? ''} onChange={material=>setDraft({...draft,material})}/><Input label="尺寸" value={draft.size ?? ''} onChange={size=>setDraft({...draft,size})}/><Input label="颜色" value={draft.color ?? ''} onChange={color=>setDraft({...draft,color})}/><Input label="目标人群" value={draft.audience ?? ''} onChange={audience=>setDraft({...draft,audience})}/><Input label="适用场景" value={draft.scene ?? ''} onChange={scene=>setDraft({...draft,scene})}/><Input label="核心卖点" value={draft.sellingPoints ?? ''} onChange={sellingPoints=>setDraft({...draft,sellingPoints})}/><Input label="禁用表达" value={draft.forbiddenTerms ?? ''} onChange={forbiddenTerms=>setDraft({...draft,forbiddenTerms})}/><Input label="供应商" value={draft.supplier ?? ''} onChange={supplier=>setDraft({...draft,supplier})}/><Input label="供应商链接" value={draft.supplierUrl ?? ''} onChange={supplierUrl=>setDraft({...draft,supplierUrl})}/></div><footer><button onClick={() => { setDialogOpen(false); setEditing(null); setDraft(emptyDraft) }}>取消</button><button className="primary" disabled={busy || !draft.name || !draft.category} onClick={() => void save()}><Save size={16}/>{busy?'保存中…':'保存商品'}</button></footer></section></div>}
  </section>
}

function Input({label,value,onChange,type='text'}:{label:string,value:string,onChange:(value:string)=>void,type?:string}) { return <label><span>{label}</span><input type={type} value={value} onChange={event=>onChange(event.target.value)}/></label> }
