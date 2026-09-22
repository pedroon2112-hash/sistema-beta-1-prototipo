// Acesso ao catálogo vindo do SQLite (via /api/catalog) + helpers derivados.
// O site público e o Admin usam os MESMOS dados — nada de produto hardcoded.

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Catalog, OptionGroupDef, Product } from "@/data/types";

export const CATALOG_KEY = ["catalog"] as const;

export const fetchCatalog = () => apiGet<Catalog>("/catalog");

export function useCatalog() {
  return useQuery({
    queryKey: CATALOG_KEY,
    queryFn: fetchCatalog,
    staleTime: 30_000,
    retry: 1,
  });
}

/** Menor preço exibível (considera variantes). */
export function minPriceCents(product: Product): number {
  if (product.variants.length > 0) {
    return Math.min(...product.variants.map((v) => v.priceCents));
  }
  return product.basePriceCents ?? 0;
}

export function productsByCategory(products: Product[], categoryId: string): Product[] {
  return products.filter((p) => p.categoryId === categoryId);
}

export function featuredProducts(catalog: Catalog | undefined): Product[] {
  if (!catalog) return [];
  const index = new Map(catalog.products.map((p) => [p.id, p]));
  return catalog.featuredProductIds
    .map((id) => index.get(id))
    .filter((p): p is Product => Boolean(p));
}

export function requiredGroups(product: Product): OptionGroupDef[] {
  return product.optionGroups.filter((g) => g.required);
}

/** Fallback seguro quando o backend está fora (site nunca fica em branco). */
export const FALLBACK_RESTAURANT = {
  name: "GalegonN Restaurante e Pizzaria",
  tagline: "Restaurante e Pizzaria",
  logo: "/assets/brand/galegonn-logo.png",
  heroImage: "/assets/products/hero-pizzaria.jpg",
  instagram: null,
  whatsapp: null,
  phone: null,
  address: null,
  openingHours: null,
};
