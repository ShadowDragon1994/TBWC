export type ProductInput = {
  name: string
  category: string
  price: number
  cost?: number | null
  material?: string
  size?: string
  color?: string
  audience?: string
  scene?: string
  sellingPoints?: string
  forbiddenTerms?: string
  supplier?: string
  supplierUrl?: string
}

export type Product = ProductInput & {
  id: string
  createdAt: string
  updatedAt: string
}
