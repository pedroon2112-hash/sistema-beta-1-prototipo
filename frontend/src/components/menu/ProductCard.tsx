import type { Product } from "@/data/types";
import { minPriceCents } from "@/data/catalog";
import { formatCents } from "@/lib/format";

interface ProductCardProps {
  product: Product;
  onOpen: (product: Product) => void;
}

function productBadge(product: Product): string | null {
  if (product.variants.length > 0) {
    return product.variants.map((v) => v.label).join(" ou ");
  }
  const included = product.optionGroups.find((g) => g.noExtraCost && g.maxSelect > 1);
  if (included) return `Até ${included.maxSelect} acompanhamentos inclusos`;
  return null;
}

export default function ProductCard({ product, onOpen }: ProductCardProps) {
  const badge = productBadge(product);
  const hasVariants = product.variants.length > 0;

  return (
    <button
      type="button"
      data-testid={`product-card-${product.id}`}
      onClick={() => onOpen(product)}
      className="group flex w-full gap-3 rounded-xl border border-[#e9d7c2] bg-white p-3 text-left transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#b94f19]/70 hover:bg-[#f1e1cf] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b94f19]"
    >
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        className="size-24 shrink-0 rounded-lg object-cover sm:size-28"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <h4 className="font-heading text-base leading-tight font-semibold text-[#33251e]">
          {product.name}
        </h4>
        {product.description && (
          <p className="line-clamp-2 text-sm leading-snug text-[#72594a]">
            {product.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
          <div>
            {hasVariants && <p className="text-[11px] text-[#796452]">a partir de</p>}
            <p
              data-testid={`product-price-${product.id}`}
              className="font-heading text-lg font-bold text-[#b94f19]"
            >
              {formatCents(minPriceCents(product))}
            </p>
          </div>
          {badge && (
            <span className="rounded-full border border-[#d6bda4] bg-[#f9ecdb] px-2 py-0.5 text-[11px] text-[#604737]">
              {badge}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
