import { useCallback, useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/data/types";

// Carrinho do frontend, persistido em localStorage. O item é um snapshot
// (nome, imagem, preço base, opções) pronto para virar pedido no Prompt 2.

const STORAGE_KEY = "galegonn.cart.v1";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Identidade de configuração: mesma configuração = mesmo item (soma quantidade). */
function identityKey(item: {
  productId: string;
  variantId?: string;
  selectedOptions: { optionId: string; noExtraCost: boolean; quantity: number }[];
  note?: string;
}): string {
  const opts = [...item.selectedOptions]
    .map((o) =>
      o.noExtraCost
        ? `${o.optionId}:i`
        : `${o.optionId}:x${o.quantity}`,
    )
    .sort()
    .join("|");
  return [item.productId, item.variantId ?? "", opts, item.note ?? ""].join("##");
}

export function unitPriceOf(item: CartItem): number {
  const extras = item.selectedOptions
    .filter((o) => !o.noExtraCost)
    .reduce((sum, o) => sum + o.unitPrice * o.quantity, 0);
  return item.baseUnitPrice + extras;
}

export function lineTotalOf(item: CartItem): number {
  return unitPriceOf(item) * item.quantity;
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

  const count = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + lineTotalOf(it), 0),
    [items],
  );

  return { items, addItem, increment, decrement, remove, clear, count, subtotal };
}

export type CartApi = ReturnType<typeof useCart>;
