import { siteConfig } from "@/config/site";
import { Product } from "@/types/product";
import { formatPrice } from "@/lib/format";

export function buildProductWhatsAppLink(product: Product, size?: string) {
  const sizeText = size ? ` talla ${size}` : "";
  const message = `Hola! Me interesa el ${product.brand} ${product.name}${
    product.colorway ? ` ${product.colorway}` : ""
  }${sizeText} — lo vi en ${formatPrice(product.price)} en la web`;

  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;
}

export function buildGeneralWhatsAppLink(message: string) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;
}
