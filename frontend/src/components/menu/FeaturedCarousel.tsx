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
        <Flame className="size-5 text-orange-500" aria-hidden />
        <h2
          id="featured-title"
          className="font-heading text-xl font-bold tracking-tight text-zinc-50"
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
            className="w-52 shrink-0 snap-start overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 text-left transition-colors duration-200 hover:border-orange-600/60 sm:w-60"
          >
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="h-32 w-full object-cover"
              />
              <span className="absolute top-2 left-2 rounded-full bg-orange-600 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                {index === 0 ? "Mais vendido" : `#${index + 1}`}
              </span>
            </div>
            <div className="p-3">
              <h3 className="truncate font-heading text-sm font-semibold text-zinc-50">
                {product.name}
              </h3>
              {product.description && (
                <p className="line-clamp-1 text-xs text-zinc-400">{product.description}</p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <div>
                  {product.variants.length > 0 && (
                    <p className="text-[11px] text-zinc-500">a partir de</p>
                  )}
                  <span className="font-heading text-base font-bold text-orange-500">
                    {formatCents(minPriceCents(product))}
                  </span>
                </div>
                <span
                  className="flex size-8 items-center justify-center rounded-full bg-orange-600 text-white"
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
