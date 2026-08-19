export type SourcingOffer = {
  id: string; title: string; category: string; wholesalePrice: number; suggestedRetailPrice: number
  minOrder: number; supplier: string; supplierUrl: string; material: string; size: string; color: string
  audience: string; scene: string; sellingPoints: string
}

export type Search1688 = (query: string) => Promise<SourcingOffer[]>
