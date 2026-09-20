import { ChevronRight } from "lucide-react";
import { formatBRL } from "@/lib/format";

interface CartBarProps {
  count: number;
  subtotal: number;
  onOpenCart: () => void;
}

// Barra flutuante inferior — atalho permanente para o carrinho no cardápio.
export default function CartBar({ count, subtotal, onOpenCart }: CartBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <button
        type="button"
        data-testid="floating-cart-bar"
        onClick={onOpenCart}
        className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-full bg-orange-600 px-5 py-3.5 text-white shadow-lg shadow-orange-950/50 transition-colors duration-200 hover:bg-orange-500"
        aria-label={`Abrir carrinho, ${count} itens, total ${formatBRL(subtotal)}`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span
            data-testid="floating-cart-count"
            className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold"
          >
            {count}
          </span>
          {count === 1 ? "item" : "itens"} no carrinho
        </span>
        <span className="flex items-center gap-1.5 font-heading text-base font-bold">
          {formatBRL(subtotal)}
          <ChevronRight className="size-5" aria-hidden />
        </span>
      </button>
    </div>
  );
}
