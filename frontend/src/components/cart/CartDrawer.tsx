import { Info, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOrder } from "@/context/OrderContext";
import type { CartApi } from "@/lib/cart";
import { lineTotalOf } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { useIsMobile } from "@/lib/useIsMobile";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartApi;
  onCheckout: () => void;
}

// Carrinho completo: distingue configurações (variante, sabor, acompanhamentos
// inclusos, extras pagos), permite quantidade e remove. Nada é enviado daqui —
// a finalização real chega no Prompt 2.
export default function CartDrawer({
  open,
  onOpenChange,
  cart,
  onCheckout,
}: CartDrawerProps) {
  const isMobile = useIsMobile();
  const { mode } = useOrder();
  const { items, subtotal, count, increment, decrement, remove } = cart;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="cart-drawer-content"
        side={isMobile ? "bottom" : "right"}
        // Altura via style: data-[side=bottom]:h-auto do SheetContent venceria
        // uma classe utilitária de altura.
        style={isMobile ? { height: "92svh" } : undefined}
        className={
          isMobile
            ? "flex flex-col gap-0 rounded-t-2xl"
            : "flex w-full flex-col gap-0 sm:max-w-md"
        }
      >
        <SheetHeader className="border-b border-zinc-800 px-4 py-3">
          <SheetTitle className="font-heading text-lg font-bold text-zinc-50">
            Seu carrinho
          </SheetTitle>
          <SheetDescription className="text-sm text-zinc-400">
            {count === 0
              ? "Nenhum item ainda"
              : `${count} ${count === 1 ? "item" : "itens"}`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div
            data-testid="cart-empty-state"
            className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
          >
            <ShoppingBag className="size-10 text-zinc-600" aria-hidden />
            <p className="text-zinc-400">Seu carrinho está vazio</p>
            <Button
              data-testid="cart-view-menu-btn"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Ver cardápio
            </Button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {items.map((item, index) => {
                const flavor = item.selectedOptions.find(
                  (o) => o.groupId === "sabor",
                );
                const included = item.selectedOptions.filter(
                  (o) => o.noExtraCost && o.groupId !== "sabor",
                );
                const extras = item.selectedOptions.filter((o) => !o.noExtraCost);

                return (
                  <div
                    key={item.cartItemId}
                    data-testid={`cart-item-row-${index}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="size-16 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-100">
                            {item.quantity}x {item.productName}
                          </p>
                          <button
                            type="button"
                            data-testid={`cart-item-remove-${index}`}
                            aria-label={`Remover ${item.productName} do carrinho`}
                            onClick={() => remove(item.cartItemId)}
                            className="text-zinc-500 transition-colors hover:text-red-400"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>

                        {item.variantLabel && (
                          <p className="text-xs text-zinc-400">
                            Tamanho: {item.variantLabel}
                          </p>
                        )}
                        {flavor && (
                          <p className="text-xs text-zinc-400">
                            Sabor: {flavor.optionLabel}
                          </p>
                        )}
                        {included.length > 0 && (
                          <p className="text-xs text-zinc-400">
                            Inclusos:{" "}
                            {included.map((o) => o.optionLabel).join(", ")}
                          </p>
                        )}
                        {extras.map((o) => (
                          <p
                            key={o.optionId}
                            className="text-xs text-zinc-400"
                          >
                            + {o.quantity}x {o.optionLabel} (
                            {formatBRL(o.unitPrice * o.quantity)})
                          </p>
                        ))}
                        {item.note && (
                          <p className="mt-1 text-xs text-orange-400/90 italic">
                            Obs.: {item.note}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              data-testid={`cart-qty-minus-${index}`}
                              aria-label={`Diminuir quantidade de ${item.productName}`}
                              onClick={() => decrement(item.cartItemId)}
                              className="flex size-9 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition-colors hover:border-zinc-500"
                            >
                              <Minus className="size-4" aria-hidden />
                            </button>
                            <span
                              data-testid={`cart-item-qty-${index}`}
                              className="w-6 text-center text-sm font-bold text-zinc-100"
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              data-testid={`cart-qty-plus-${index}`}
                              aria-label={`Aumentar quantidade de ${item.productName}`}
                              onClick={() => increment(item.cartItemId)}
                              className="flex size-9 items-center justify-center rounded-md bg-orange-600 text-white transition-colors hover:bg-orange-500"
                            >
                              <Plus className="size-4" aria-hidden />
                            </button>
                          </div>
                          <span
                            data-testid={`cart-item-total-${index}`}
                            className="font-heading text-base font-bold text-orange-500"
                          >
                            {formatBRL(lineTotalOf(item))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span>Subtotal</span>
                <span data-testid="cart-subtotal">{formatBRL(subtotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between font-heading text-lg font-bold text-zinc-50">
                <span>Total</span>
                <span data-testid="cart-total">{formatBRL(subtotal)}</span>
              </div>

              {mode === "delivery" ? (
                <Button
                  data-testid="checkout-open-btn"
                  onClick={onCheckout}
                  className="mt-3 h-12 w-full bg-orange-600 font-heading text-base font-bold text-white hover:bg-orange-500"
                >
                  Finalizar pedido
                </Button>
              ) : (
                <div
                  data-testid="local-checkout-notice"
                  className="mt-3 flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400"
                >
                  <Info className="mt-0.5 size-4 shrink-0 text-orange-500" aria-hidden />
                  <p>
                    O envio digital do pedido no local será ativado em breve.
                    Por enquanto, nada é enviado ao restaurante.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
