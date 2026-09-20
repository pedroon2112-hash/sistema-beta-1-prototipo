import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

// Modo do pedido ("local" com mesa ou "delivery"). Estado do frontend no
// Prompt 1 — o backend assumirá no Prompt 2. Persiste em sessionStorage para
// sobreviver a recarregamentos na mesma aba.

export type OrderMode = "local" | "delivery";

interface OrderState {
  mode: OrderMode;
  tableNumber: number | null;
}

const STORAGE_KEY = "galegonn.order.v1";

function loadState(): OrderState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OrderState;
      if (parsed.mode === "local" || parsed.mode === "delivery") return parsed;
    }
  } catch {
    // ignore
  }
  return { mode: null as unknown as OrderMode, tableNumber: null };
}

interface OrderContextValue {
  mode: OrderMode | null;
  tableNumber: number | null;
  setLocalMode: (table: number | null) => void;
  setDeliveryMode: () => void;
  reset: () => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrderState>(loadState);

  const persist = useCallback((next: OrderState) => {
    setState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const setLocalMode = useCallback(
    (table: number | null) => persist({ mode: "local", tableNumber: table }),
    [persist],
  );
  const setDeliveryMode = useCallback(
    () => persist({ mode: "delivery", tableNumber: null }),
    [persist],
  );
  const reset = useCallback(
    () =>
      persist({ mode: null as unknown as OrderMode, tableNumber: null }),
    [persist],
  );

  const value = useMemo<OrderContextValue>(
    () => ({
      mode: state.mode ?? null,
      tableNumber: state.tableNumber,
      setLocalMode,
      setDeliveryMode,
      reset,
    }),
    [state, setLocalMode, setDeliveryMode, reset],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrder(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder deve ser usado dentro de OrderProvider");
  return ctx;
}
