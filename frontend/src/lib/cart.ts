import { useCallback, useEffect, useMemo, useState } from "react";
import type { CartItem, OrderCreatePayload } from "@/data/types";

// Carrinho do frontend em CENTAVOS, persistido em localStorage.
// O backend é a autoridade final de preço: daqui só saem ids/quantidades.

const STORAGE_KEY = "galegonn.cart.v2";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    // descarta itens do formato antigo (Prompt 1 usava reais)
    return parsed.filter((it) => typeof it?.baseUnitPriceCents === "number");
  } catch {
    return [];
  }
}

function identityKey(item: {
  productId: string;
  variantId?: string;
  selectedOptions: { optionId: string; noExtraCost: boolean; quantity: number }[];
  note?: string;
}): string {
  const opts = [...item.selectedOptions]
    .map((o) => (o.noExtraCost ? `${o.optionId}:i` : `${o.optionId}:x${o.quantity}`))
    .sort()
    .join("|");
  return [item.productId, item.variantId ?? "", opts, item.note ?? ""].join("##");
}

export function unitPriceCentsOf(item: CartItem): number {
  const extras = item.selectedOptions
    .filter((o) => !o.noExtraCost)
    .reduce((sum, o) => sum + o.unitPriceCents * o.quantity, 0);
  return item.baseUnitPriceCents + extras;
}

export function lineTotalCentsOf(item: CartItem): number {
  return unitPriceCentsOf(item) * item.quantity;
}

/** Converte o carrinho no payload do pedido (sem preços — backend recalcula). */
export function cartToOrderItems(items: CartItem[]): OrderCreatePayload["items"] {
  return items.map((it) => ({
    productId: it.productId,
    variantId: it.variantId ?? null,
    options: it.selectedOptions.map((o) => ({
      groupId: o.groupId,
      optionId: o.optionId,
      quantity: o.quantity,
    })),
    quantity: it.quantity,
    note: it.note ?? null,
  }));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage indisponível — carrinho vive só em memória.
    }
  }, [items]);

  const addItem = useCallback((candidate: Omit<CartItem, "cartItemId">) => {
    setItems((prev) => {
      const key = identityKey(candidate);
      const existing = prev.find((it) => identityKey(it) === key);
      if (existing) {
        return prev.map((it) =>
          it.cartItemId === existing.cartItemId
            ? { ...it, quantity: it.quantity + candidate.quantity }
            : it,
        );
      }
      const newItem: CartItem = {
        ...candidate,
        cartItemId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
      };
      return [...prev, newItem];
    });
  }, []);

  const increment = useCallback((cartItemId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.cartItemId === cartItemId ? { ...it, quantity: it.quantity + 1 } : it,
      ),
    );
  }, []);

  const decrement = useCallback((cartItemId: string) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.cartItemId === cartItemId ? { ...it, quantity: it.quantity - 1 } : it,
        )
        .filter((it) => it.quantity > 0),
    );
  }, []);

  const remove = useCallback((cartItemId: string) => {
    setItems((prev) => prev.filter((it) => it.cartItemId !== cartItemId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((s, it) => s + it.quantity, 0), [items]);
  const subtotalCents = useMemo(
    () => items.reduce((s, it) => s + lineTotalCentsOf(it), 0),
    [items],
  );

  return {
    items,
    addItem,
    increment,
    decrement,
    remove,
    clear,
    count,
    subtotalCents,
  };
}

export type CartApi = ReturnType<typeof useCart>;
