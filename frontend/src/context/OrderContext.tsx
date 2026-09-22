import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

// Modo do pedido ("local" com mesa ou "delivery"). A mesa é SOMENTE a
// identificação de onde o cliente está — não existe abrir/fechar mesa.

export type OrderMode = "local" | "delivery";

interface OrderState {
  mode: OrderMode | null;
  tableLabel: string | null;
}

const STORAGE_KEY = "galegonn.order.v2";

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
  return { mode: null, tableLabel: null };
}

interface OrderContextValue {
  mode: OrderMode | null;
  tableLabel: string | null;
  setLocalMode: (tableLabel: string | null) => void;
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
    (tableLabel: string | null) => persist({ mode: "local", tableLabel }),
    [persist],
  );
  const setDeliveryMode = useCallback(
    () => persist({ mode: "delivery", tableLabel: null }),
    [persist],
  );
  const reset = useCallback(() => persist({ mode: null, tableLabel: null }), [persist]);

  const value = useMemo<OrderContextValue>(
    () => ({
      mode: state.mode,
      tableLabel: state.tableLabel,
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
