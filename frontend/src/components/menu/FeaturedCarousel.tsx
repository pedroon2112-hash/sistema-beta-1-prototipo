import { Flame, Plus } from "lucide-react";
import type { Product } from "@/data/types";
import { minPriceCents } from "@/data/catalog";
import { formatCents } from "@/lib/format";

interface FeaturedCarouselProps {
  products: Product[];
  onOpen: (product: Product) => void;
}

// Carrossel horizontal — referencia produtos reais por id (nunca duplica dados).
export default function FeaturedCarousel({ products, onOpen }: FeaturedCarouselProps) {
  return (
    <section aria-labelledby="featured-title" data-testid="featured-carousel">
      <div className="flex items-center gap-2">
        <Flame className="size-5 text-[#b94f19]" aria-hidden />
        <h2
          id="featured-title"
          className="font-heading text-xl font-bold tracking-tight text-[#33251e]"
        >
          Mais Pedidos
        </h2>
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {products.map((product, index) => (
          <button
            key={product.id}
            type="button"
            data-testid={`featured-card-${product.id}`}
            onClick={() => onOpen(product)}
            className="w-52 shrink-0 snap-start overflow-hidden rounded-xl border border-[#e9d7c2] bg-white text-left transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#b94f19]/70 hover:bg-[#f1e1cf] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b94f19] sm:w-60"
          >
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="h-32 w-full object-cover"
              />
              <span className="absolute top-2 left-2 rounded-full bg-[#b94f19] px-2 py-0.5 text-[11px] font-bold text-white shadow">
                {index === 0 ? "Mais vendido" : `#${index + 1}`}
              </span>
            </div>
            <div className="p-3">
              <h3 className="truncate font-heading text-sm font-semibold text-[#33251e]">
                {product.name}
              </h3>
              {product.description && (
                <p className="line-clamp-1 text-xs text-[#72594a]">{product.description}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <div>
                  {product.variants.length > 0 && (
                    <p className="text-[11px] text-[#796452]">a partir de</p>
                  )}
                  <span className="font-heading text-base font-bold text-[#b94f19]">
                    {formatCents(minPriceCents(product))}
                  </span>
                </div>
                <span
                  className="flex size-8 items-center justify-center rounded-full bg-[#b94f19] text-white"
                  aria-hidden
                >
                  <Plus className="size-4" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
