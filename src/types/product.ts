export type ProductCategory = "sneakers" | "streetwear";
export type ProductCondition = "nuevo" | "usado";

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  colorway?: string;
  category: ProductCategory;
  subcategory?: string;
  price: number;
  sizes: string[];
  condition: ProductCondition;
  description: string;
  images: string[];
  featured?: boolean;
  isNew?: boolean;
  dateAdded: string;
}

/** Un grupo de una o más filas (variantes) que son la misma silueta/colorway,
 * pero con precio, talla y/o condición distintos (ej. varios pares del mismo
 * modelo consignados por diferentes vendedores). */
export interface ProductGroup {
  groupSlug: string;
  name: string;
  brand: string;
  colorway?: string;
  category: ProductCategory;
  subcategory?: string;
  description: string;
  images: string[];
  featured: boolean;
  isNew: boolean;
  dateAdded: string;
  variants: Product[];
}
