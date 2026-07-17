import type { AppDatabase } from '../shared/database'
import type { Product, ProductInput } from './product.types'

type ProductRow = {
  id: string; name: string; category: string; price: number; cost: number | null
  material: string; size: string; color: string; audience: string; scene: string
  selling_points: string; forbidden_terms: string; supplier: string; supplier_url: string
  created_at: string; updated_at: string
}

const fromRow = (row: ProductRow): Product => ({
  id: row.id, name: row.name, category: row.category, price: row.price, cost: row.cost,
  material: row.material, size: row.size, color: row.color, audience: row.audience,
  scene: row.scene, sellingPoints: row.selling_points, forbiddenTerms: row.forbidden_terms,
  supplier: row.supplier, supplierUrl: row.supplier_url, createdAt: row.created_at, updatedAt: row.updated_at,
})

export function createProductRepository(database: AppDatabase) {
  const insert = database.prepare(`INSERT INTO products
    (id,name,category,price,cost,material,size,color,audience,scene,selling_points,forbidden_terms,supplier,supplier_url,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  const update = database.prepare(`UPDATE products SET name=?,category=?,price=?,cost=?,material=?,size=?,color=?,audience=?,scene=?,selling_points=?,forbidden_terms=?,supplier=?,supplier_url=?,updated_at=? WHERE id=?`)
  const list = database.prepare('SELECT * FROM products ORDER BY updated_at DESC')
  const find = database.prepare('SELECT * FROM products WHERE id=?')
  const remove = database.prepare('DELETE FROM products WHERE id=?')

  return {
    create(product: Product) {
      insert.run(product.id, product.name, product.category, product.price, product.cost ?? null, product.material ?? '', product.size ?? '', product.color ?? '', product.audience ?? '', product.scene ?? '', product.sellingPoints ?? '', product.forbiddenTerms ?? '', product.supplier ?? '', product.supplierUrl ?? '', product.createdAt, product.updatedAt)
      return product
    },
    list: () => (list.all() as ProductRow[]).map(fromRow),
    find: (id: string) => { const row = find.get(id) as ProductRow | undefined; return row ? fromRow(row) : undefined },
    update(id: string, product: ProductInput, updatedAt: string) {
      update.run(product.name, product.category, product.price, product.cost ?? null, product.material ?? '', product.size ?? '', product.color ?? '', product.audience ?? '', product.scene ?? '', product.sellingPoints ?? '', product.forbiddenTerms ?? '', product.supplier ?? '', product.supplierUrl ?? '', updatedAt, id)
      return this.find(id)
    },
    remove: (id: string) => remove.run(id).changes > 0,
    replaceAll(products: Product[]) {
      database.exec('BEGIN')
      try {
        database.exec('DELETE FROM products')
        for (const product of products) this.create(product)
        database.exec('COMMIT')
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
    },
  }
}

export type ProductRepository = ReturnType<typeof createProductRepository>
