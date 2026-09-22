// Cliente das rotas administrativas. A sessão é um cookie httpOnly definido
// pelo backend: nenhum token é manipulado aqui.

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import type { Catalog, Order } from "@/data/types";

export interface AdminMe {
  username: string;
}

export interface OrderSummary {
  id: string;
  kind: "local" | "delivery";
  number: number;
  localDate: string;
  localTime: string;
  tableLabel: string | null;
  customerName: string | null;
  paymentLabel: string;
  totalCents: number;
  comandaUrl: string;
}

export interface OrderListResponse {
  count: number;
  sumCents: number;
  orders: OrderSummary[];
}

export interface DayNode {
  day: number;
  date: string;
  localCents: number;
  deliveryCents: number;
  totalCents: number;
  orders: number;
}

export interface MonthNode {
  month: number;
  label: string;
  localCents: number;
  deliveryCents: number;
  totalCents: number;
  orders: number;
  days: DayNode[];
}

export interface YearNode {
  year: number;
  localCents: number;
  deliveryCents: number;
  totalCents: number;
  orders: number;
  months: MonthNode[];
}

export interface TableGroup {
  tableLabel: string | null;
  comandas: number;
  totalCents: number;
  orders: { id: string; number: number; localTime: string; totalCents: number; comandaUrl: string }[];
}

export const adminApi = {
  login: (username: string, password: string) =>
    apiPost<AdminMe>("/admin/login", { username, password }),
  logout: () => apiPost<{ ok: boolean }>("/admin/logout"),
  me: () => apiGet<AdminMe>("/admin/me"),
  catalog: () => apiGet<Catalog>("/admin/catalog"),
  periods: () => apiGet<{ years: YearNode[] }>("/admin/orders/periods"),
  orders: (params: { date?: string; kind?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params.date) qs.set("date", params.date);
    if (params.kind) qs.set("kind", params.kind);
    qs.set("limit", String(params.limit ?? 100));
    return apiGet<OrderListResponse>(`/admin/orders?${qs.toString()}`);
  },
  ordersByTable: (date: string) =>
    apiGet<{ date: string; groups: TableGroup[] }>(
      `/admin/orders/by-table?date=${encodeURIComponent(date)}`,
    ),
  orderDetail: (id: string) => apiGet<Order>(`/admin/orders/${id}`),
  updateProduct: (
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      basePriceCents?: number | null;
      available?: boolean;
      image?: string;
      categoryId?: string;
    },
  ) => apiPatch<{ ok: boolean }>(`/admin/products/${id}`, patch),
  createProduct: (payload: {
    name: string;
    categoryId: string;
    description?: string | null;
    basePriceCents?: number | null;
    image?: string;
  }) => apiPost<{ id: string }>("/admin/products", payload),
  deleteProduct: (id: string) => apiDelete<{ ok: boolean }>(`/admin/products/${id}`),
  setVariants: (id: string, variants: { variantKey: string; label: string; priceCents: number }[]) =>
    apiPut<{ ok: boolean }>(`/admin/products/${id}/variants`, variants),
  setOptionGroups: (id: string, groups: unknown[]) =>
    apiPut<{ ok: boolean }>(`/admin/products/${id}/option-groups`, groups),
  setFeatured: (productIds: string[]) =>
    apiPut<{ ok: boolean }>("/admin/featured", { productIds }),
  createTable: (label: string) => apiPost<{ id: number; label: string }>("/admin/tables", { label }),
  renameTable: (id: number, label: string) =>
    apiPatch<{ ok: boolean }>(`/admin/tables/${id}`, { label }),
  deleteTable: (id: number) => apiDelete<{ ok: boolean }>(`/admin/tables/${id}`),
  updateRestaurant: (patch: Record<string, string | null>) =>
    apiPatch<{ ok: boolean }>("/admin/restaurant", patch),
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/uploads", { method: "POST", body: form });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(body?.detail ?? "Falha no upload da imagem.");
    }
    return (await res.json()) as { url: string };
  },
};

/** 'R$ 27,90' digitado pelo usuário -> 2790 centavos. */
export function parseCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
