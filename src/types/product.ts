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
