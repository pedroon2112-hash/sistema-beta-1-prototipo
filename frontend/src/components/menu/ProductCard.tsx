import type { Product } from "@/data/types";
import { minPrice } from "@/data/menu";
import { formatBRL } from "@/lib/format";

interface ProductCardProps {
  product: Product;
  onOpen: (product: Product) => void;
}

function productBadge(product: Product): string | null {
  if (product.variants?.length) return "Média ou Grande";
  if (product.optionGroups?.some((g) => g.id === "acompanhamentos"))
    return "Até 3 acompanhamentos inclusos";
  return null;
}

export default function ProductCard({ product, onOpen }: ProductCardProps) {
  const badge = productBadge(product);
  const hasVariants = Boolean(product.variants?.length);

  return (
    <button
      type="button"
      data-testid={`product-card-${product.id}`}
      onClick={() => onOpen(product)}
      className="group flex w-full gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-left transition-colors duration-200 hover:border-orange-600/60 hover:bg-zinc-900"
    >
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        className="size-24 shrink-0 rounded-lg object-cover sm:size-28"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-heading text-base leading-tight font-semibold text-zinc-50">
            {product.name}
          </h4>
        </div>
        {product.description && (
          <p className="line-clamp-2 text-sm leading-snug text-zinc-400">
            {product.description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
          <div>
            {hasVariants && (
              <p className="text-[11px] text-zinc-500">a partir de</p>
            )}
            <p className="font-heading text-lg font-bold text-orange-500">
              {formatBRL(minPrice(product))}
            </p>
          </div>
          {badge && (
            <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-300">
              {badge}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
