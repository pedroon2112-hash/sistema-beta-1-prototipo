import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Download,
  Loader2,
  LogOut,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi, parseCents } from "@/lib/adminApi";
import type { OrderSummary, TableGroup, YearNode } from "@/lib/adminApi";
import type { Catalog, Product } from "@/data/types";
import { formatCents, formatDateBR, downloadComanda } from "@/lib/format";
import { ApiError } from "@/lib/api";

// Central administrativa — tudo persiste no SQLite via backend protegido.
export default function Admin() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: adminApi.me,
    retry: false,
  });

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-300">
        <Loader2 className="size-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (meQuery.isError) return <LoginScreen onLogged={() => meQuery.refetch()} />;

  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-orange-700/40 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="rounded-md bg-orange-600 px-2 py-1 text-xs font-bold text-white">
            MODO ADMIN
          </span>
          <span className="truncate text-sm text-zinc-400">
            {meQuery.data?.username}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/"
              data-testid="admin-view-site"
              className="text-xs text-zinc-400 hover:text-orange-400"
            >
              Ver site
            </Link>
            <Button
              data-testid="admin-logout-btn"
              size="sm"
              variant="outline"
              onClick={async () => {
                await adminApi.logout();
                await queryClient.clear();
                meQuery.refetch();
              }}
            >
              <LogOut className="mr-1.5 size-4" aria-hidden />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <Tabs defaultValue="pedidos">
          <TabsList data-testid="admin-tabs" className="flex-wrap">
            <TabsTrigger value="pedidos" data-testid="admin-tab-pedidos">
              Pedidos / Histórico
            </TabsTrigger>
            <TabsTrigger value="cardapio" data-testid="admin-tab-cardapio">
              Cardápio
            </TabsTrigger>
            <TabsTrigger value="mesas" data-testid="admin-tab-mesas">
              Mesas
            </TabsTrigger>
            <TabsTrigger value="restaurante" data-testid="admin-tab-restaurante">
              Restaurante
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pedidos" className="pt-4">
            <OrdersTab />
          </TabsContent>
          <TabsContent value="cardapio" className="pt-4">
            <MenuTab />
          </TabsContent>
          <TabsContent value="mesas" className="pt-4">
            <TablesTab />
          </TabsContent>
          <TabsContent value="restaurante" className="pt-4">
            <RestaurantTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function LoginScreen({ onLogged }: { onLogged: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await adminApi.login(username.trim(), password);
      onLogged();
    } catch (err) {
      const apiErr = err as ApiError;
      const detail = (apiErr?.body as { detail?: string } | undefined)?.detail;
      setError(detail ?? "Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <h1 className="font-heading text-xl font-bold text-zinc-50">Admin GalegonN</h1>
        <p className="mt-1 text-sm text-zinc-400">Acesso restrito ao restaurante.</p>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="admin-user">Usuário</Label>
            <Input
              id="admin-user"
              data-testid="admin-login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="border-zinc-800 bg-zinc-950"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="admin-pass">Senha</Label>
            <Input
              id="admin-pass"
              data-testid="admin-login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoComplete="current-password"
              className="border-zinc-800 bg-zinc-950"
            />
          </div>
          {error && (
            <p data-testid="admin-login-error" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <Button
            data-testid="admin-login-submit"
            onClick={submit}
            disabled={loading}
            className="h-11 bg-orange-600 font-bold text-white hover:bg-orange-500"
          >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Entrar"}
          </Button>
          <Link to="/" className="text-center text-xs text-zinc-500 hover:text-orange-400">
            Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}

function RevenueRow({
  label,
  local,
  delivery,
  total,
  testId,
}: {
  label: string;
  local: number;
  delivery: number;
  total: number;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
      <span>
        Local: <b className="text-zinc-200">{formatCents(local)}</b>
      </span>
      <span>
        Delivery: <b className="text-zinc-200">{formatCents(delivery)}</b>
      </span>
      <span>
        Total {label}: <b className="text-orange-400">{formatCents(total)}</b>
      </span>
    </div>
  );
}

function OrdersTab() {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const periods = useQuery({ queryKey: ["admin", "periods"], queryFn: adminApi.periods });

  if (periods.isLoading) {
    return <Loader2 className="size-5 animate-spin text-zinc-400" aria-hidden />;
  }
  const years = periods.data?.years ?? [];
  if (years.length === 0) {
    return (
      <p data-testid="admin-orders-empty" className="text-zinc-400">
        Nenhum pedido registrado ainda.
      </p>
    );
  }

  return (
    <div data-testid="admin-history" className="space-y-4">
      {years.map((year: YearNode) => (
        <div key={year.year} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 data-testid={`history-year-${year.year}`} className="font-heading text-lg font-bold">
            {year.year}
          </h2>
          <RevenueRow
            label="ano"
            local={year.localCents}
            delivery={year.deliveryCents}
            total={year.totalCents}
            testId={`revenue-year-${year.year}`}
          />
          <div className="mt-3 space-y-3">
            {year.months.map((month) => (
              <div key={month.month} className="rounded-lg border border-zinc-800 p-3">
                <h3
                  data-testid={`history-month-${year.year}-${month.month}`}
                  className="font-heading font-semibold text-zinc-100"
                >
                  {month.label}
                </h3>
                <RevenueRow
                  label="mês"
                  local={month.localCents}
                  delivery={month.deliveryCents}
                  total={month.totalCents}
                  testId={`revenue-month-${year.year}-${month.month}`}
                />
                <div className="mt-2 space-y-2">
                  {month.days.map((day) => (
                    <div key={day.date} className="rounded-md bg-zinc-950/60 p-2">
                      <button
                        type="button"
                        data-testid={`history-day-${day.date}`}
                        onClick={() => setOpenDate(openDate === day.date ? null : day.date)}
                        className="flex w-full items-center justify-between gap-2 text-left"
                      >
                        <span className="text-sm font-medium text-zinc-200">
                          Dia {String(day.day).padStart(2, "0")} — {formatDateBR(day.date)}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-zinc-400">
                          {day.orders} comandas
                          <ChevronDown
                            className={`size-4 transition-transform ${openDate === day.date ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </span>
                      </button>
                      <RevenueRow
                        label="dia"
                        local={day.localCents}
                        delivery={day.deliveryCents}
                        total={day.totalCents}
                        testId={`revenue-day-${day.date}`}
                      />
                      {openDate === day.date && <DayDetail date={day.date} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DayDetail({ date }: { date: string }) {
  const orders = useQuery({
    queryKey: ["admin", "orders", date],
    queryFn: () => adminApi.orders({ date }),
  });
  const byTable = useQuery({
    queryKey: ["admin", "by-table", date],
    queryFn: () => adminApi.ordersByTable(date),
  });

  return (
    <div className="mt-3 space-y-3 border-t border-zinc-800 pt-3">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-orange-500">
          Comandas do dia
        </h4>
        <div className="mt-2 space-y-1.5">
          {(orders.data?.orders ?? []).map((order: OrderSummary) => (
            <div
              key={order.id}
              data-testid={`admin-order-${order.kind}-${order.number}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 text-sm"
            >
              <span className="text-zinc-200">
                <b className="uppercase text-orange-400">{order.kind}</b> nº {order.number} ·{" "}
                {order.localTime} · {order.tableLabel ?? order.customerName ?? "—"} ·{" "}
                {order.paymentLabel}
              </span>
              <span className="flex items-center gap-2">
                <b className="text-zinc-100">{formatCents(order.totalCents)}</b>
                <Button
                  size="xs"
                  variant="outline"
                  data-testid={`admin-download-${order.kind}-${order.number}`}
                  onClick={() =>
                    downloadComanda(
                      order.comandaUrl,
                      `galegonn-${order.kind}-pedido-${order.number}.pdf`,
                    )
                  }
                >
                  <Download className="mr-1 size-3" aria-hidden />
                  Comanda
                </Button>
              </span>
            </div>
          ))}
          {(orders.data?.orders ?? []).length === 0 && (
            <p className="text-xs text-zinc-500">Sem comandas neste dia.</p>
          )}
        </div>
      </div>

      {(byTable.data?.groups ?? []).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-orange-500">
            Agrupamento por mesa (histórico)
          </h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(byTable.data?.groups ?? []).map((group: TableGroup) => (
              <div
                key={group.tableLabel ?? "sem-mesa"}
                data-testid={`admin-table-group-${(group.tableLabel ?? "sem-mesa").replace(/\s+/g, "-")}`}
                className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5 text-sm"
              >
                <p className="font-semibold text-zinc-100">{group.tableLabel ?? "Sem mesa"}</p>
                <p className="text-xs text-zinc-400">
                  {group.comandas} {group.comandas === 1 ? "comanda" : "comandas"} ·{" "}
                  <b className="text-orange-400">{formatCents(group.totalCents)}</b>
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-zinc-400">
                  {group.orders.map((o) => (
                    <li key={o.id}>
                      Pedido Local {o.number} · {o.localTime} · {formatCents(o.totalCents)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuTab() {
  const queryClient = useQueryClient();
  const catalogQuery = useQuery({ queryKey: ["admin", "catalog"], queryFn: adminApi.catalog });
  const [categoryId, setCategoryId] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const catalog = catalogQuery.data;
  const activeCategory = categoryId || catalog?.categories[0]?.id || "";
  const products = (catalog?.products ?? []).filter((p) => p.categoryId === activeCategory);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
    await queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const createProduct = useMutation({
    mutationFn: async () => {
      const cents = newPrice ? parseCents(newPrice) : null;
      if (!newName.trim()) throw new Error("Informe o nome do produto.");
      if (newPrice && cents === null) throw new Error("Preço inválido.");
      return adminApi.createProduct({
        name: newName.trim(),
        categoryId: activeCategory,
        basePriceCents: cents,
        image: "",
      });
    },
    onSuccess: async () => {
      setNewName("");
      setNewPrice("");
      await refresh();
      toast.success("Produto criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (catalogQuery.isLoading) {
    return <Loader2 className="size-5 animate-spin text-zinc-400" aria-hidden />;
  }

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {(catalog?.categories ?? []).map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-testid={`admin-category-${cat.id}`}
            onClick={() => setCategoryId(cat.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              cat.id === activeCategory
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-zinc-800 bg-zinc-900 text-zinc-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="grid gap-1">
          <Label htmlFor="new-product-name" className="text-xs">
            Novo produto
          </Label>
          <Input
            id="new-product-name"
            data-testid="admin-new-product-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome"
            className="h-9 w-48 border-zinc-800 bg-zinc-950"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="new-product-price" className="text-xs">
            Preço
          </Label>
          <Input
            id="new-product-price"
            data-testid="admin-new-product-price"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="0,00"
            className="h-9 w-28 border-zinc-800 bg-zinc-950"
          />
        </div>
        <Button
          data-testid="admin-create-product"
          size="sm"
          onClick={() => createProduct.mutate()}
          disabled={createProduct.isPending}
          className="bg-orange-600 text-white hover:bg-orange-500"
        >
          <Plus className="mr-1 size-4" aria-hidden />
          Criar
        </Button>
      </div>

      <div className="space-y-2">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            featured={(catalog?.featuredProductIds ?? []).includes(product.id)}
            allFeatured={catalog?.featuredProductIds ?? []}
            onChanged={refresh}
          />
        ))}
      </div>
    </div>
  );
}

function ProductRow({
  product,
  featured,
  allFeatured,
  onChanged,
}: {
  product: Product;
  featured: boolean;
  allFeatured: string[];
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(
    product.basePriceCents != null ? (product.basePriceCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      product.variants.map((v) => [v.id, (v.priceCents / 100).toFixed(2).replace(".", ",")]),
    ),
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const cents = price ? parseCents(price) : null;
      if (price && cents === null) throw new Error("Preço inválido.");
      await adminApi.updateProduct(product.id, {
        name: name.trim(),
        description: description.trim() || null,
        basePriceCents: product.variants.length > 0 ? null : cents,
      });
      if (product.variants.length > 0) {
        const variants = product.variants.map((v) => {
          const parsed = parseCents(variantPrices[v.id] ?? "");
          if (parsed === null) throw new Error(`Preço inválido em ${v.label}.`);
          return { variantKey: v.id, label: v.label, priceCents: parsed };
        });
        await adminApi.setVariants(product.id, variants);
      }
      await onChanged();
      toast.success("Alteração salva");
    } catch (err) {
      const apiErr = err as ApiError;
      const detail = (apiErr?.body as { detail?: string } | undefined)?.detail;
      toast.error(detail ?? (err as Error).message ?? "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailable() {
    setBusy(true);
    try {
      await adminApi.updateProduct(product.id, { available: !product.available });
      await onChanged();
      toast.success(product.available ? "Produto desativado" : "Produto ativado");
    } catch {
      toast.error("Não foi possível alterar a disponibilidade.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeatured() {
    setBusy(true);
    try {
      const next = featured
        ? allFeatured.filter((id) => id !== product.id)
        : [...allFeatured, product.id];
      await adminApi.setFeatured(next);
      await onChanged();
      toast.success(featured ? "Removido dos Mais Pedidos" : "Adicionado aos Mais Pedidos");
    } catch {
      toast.error("Não foi possível atualizar os destaques.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(file: File) {
    setBusy(true);
    try {
      const { url } = await adminApi.uploadImage(file);
      await adminApi.updateProduct(product.id, { image: url });
      await onChanged();
      toast.success("Foto atualizada");
    } catch (err) {
      toast.error((err as Error).message ?? "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct() {
    if (!window.confirm(`Remover "${product.name}" do cardápio? Pedidos antigos são preservados.`))
      return;
    setBusy(true);
    try {
      await adminApi.deleteProduct(product.id);
      await onChanged();
      toast.success("Produto removido");
    } catch {
      toast.error("Não foi possível remover.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-testid={`admin-product-${product.id}`}
      className={`rounded-xl border p-3 ${product.available ? "border-zinc-800 bg-zinc-900/50" : "border-amber-800/60 bg-amber-950/10"}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <img src={product.image || "/favicon.svg"} alt="" className="size-14 rounded-lg object-cover" />
        <div className="grid min-w-[180px] flex-1 gap-2">
          <Input
            data-testid={`admin-product-name-${product.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 border-zinc-800 bg-zinc-950"
          />
          <Input
            data-testid={`admin-product-desc-${product.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            className="h-9 border-zinc-800 bg-zinc-950 text-xs"
          />
        </div>

        <div className="grid gap-2">
          {product.variants.length === 0 ? (
            <div className="grid gap-1">
              <Label className="text-[11px] text-zinc-400">Preço</Label>
              <Input
                data-testid={`admin-product-price-${product.id}`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-9 w-24 border-zinc-800 bg-zinc-950"
              />
            </div>
          ) : (
            product.variants.map((v) => (
              <div key={v.id} className="grid gap-1">
                <Label className="text-[11px] text-zinc-400">{v.label}</Label>
                <Input
                  data-testid={`admin-variant-price-${product.id}-${v.id}`}
                  value={variantPrices[v.id] ?? ""}
                  onChange={(e) =>
                    setVariantPrices((prev) => ({ ...prev, [v.id]: e.target.value }))
                  }
                  className="h-9 w-24 border-zinc-800 bg-zinc-950"
                />
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            data-testid={`admin-save-${product.id}`}
            onClick={save}
            disabled={busy}
            className="bg-orange-600 text-white hover:bg-orange-500"
          >
            <Save className="mr-1 size-3.5" aria-hidden />
            Salvar
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-testid={`admin-toggle-available-${product.id}`}
            onClick={toggleAvailable}
            disabled={busy}
          >
            {product.available ? "Desativar" : "Ativar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-testid={`admin-toggle-featured-${product.id}`}
            onClick={toggleFeatured}
            disabled={busy}
            className={featured ? "border-orange-600 text-orange-400" : ""}
          >
            <Star className="mr-1 size-3.5" aria-hidden />
            {featured ? "Destaque" : "Destacar"}
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 hover:border-zinc-500">
            <Upload className="size-3.5" aria-hidden />
            Foto
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              data-testid={`admin-upload-${product.id}`}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto(file);
                e.target.value = "";
              }}
            />
          </label>
          <Button
            size="sm"
            variant="ghost"
            data-testid={`admin-delete-${product.id}`}
            onClick={removeProduct}
            disabled={busy}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>
      {!product.available && (
        <p className="mt-2 text-xs text-amber-400">
          Indisponível — não aparece no cardápio público.
        </p>
      )}
    </div>
  );
}

function TablesTab() {
  const queryClient = useQueryClient();
  const catalogQuery = useQuery({ queryKey: ["admin", "catalog"], queryFn: adminApi.catalog });
  const [label, setLabel] = useState("");
  const tables = catalogQuery.data?.tables ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
    await queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="grid gap-1">
          <Label htmlFor="new-table" className="text-xs">
            Nova mesa
          </Label>
          <Input
            id="new-table"
            data-testid="admin-new-table-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Mesa 13"
            className="h-9 w-40 border-zinc-800 bg-zinc-950"
          />
        </div>
        <Button
          size="sm"
          data-testid="admin-create-table"
          className="bg-orange-600 text-white hover:bg-orange-500"
          onClick={async () => {
            try {
              await adminApi.createTable(label.trim());
              setLabel("");
              await refresh();
              toast.success("Mesa adicionada");
            } catch (err) {
              const detail = ((err as ApiError)?.body as { detail?: string } | undefined)?.detail;
              toast.error(detail ?? "Não foi possível adicionar a mesa.");
            }
          }}
        >
          <Plus className="mr-1 size-4" aria-hidden />
          Adicionar
        </Button>
      </div>

      <div data-testid="admin-tables-list" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <TableRow key={table.id} id={table.id} label={table.label} onChanged={refresh} />
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Mesas não têm status operacional. Remover uma mesa não apaga pedidos antigos.
      </p>
    </div>
  );
}

function TableRow({
  id,
  label,
  onChanged,
}: {
  id: number;
  label: string;
  onChanged: () => Promise<void>;
}) {
  const [value, setValue] = useState(label);
  return (
    <div
      data-testid={`admin-table-${id}`}
      className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2"
    >
      <Input
        data-testid={`admin-table-input-${id}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 border-zinc-800 bg-zinc-950"
      />
      <Button
        size="sm"
        variant="outline"
        data-testid={`admin-table-save-${id}`}
        onClick={async () => {
          try {
            await adminApi.renameTable(id, value.trim());
            await onChanged();
            toast.success("Mesa atualizada");
          } catch (err) {
            const detail = ((err as ApiError)?.body as { detail?: string } | undefined)?.detail;
            toast.error(detail ?? "Não foi possível salvar.");
          }
        }}
      >
        <Save className="size-3.5" aria-hidden />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        data-testid={`admin-table-delete-${id}`}
        className="text-red-400 hover:text-red-300"
        onClick={async () => {
          if (!window.confirm(`Remover ${label} do cadastro?`)) return;
          try {
            await adminApi.deleteTable(id);
            await onChanged();
            toast.success("Mesa removida");
          } catch {
            toast.error("Não foi possível remover.");
          }
        }}
      >
        <Trash2 className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}

const RESTAURANT_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "name", label: "Nome", placeholder: "GalegonN Restaurante e Pizzaria" },
  { key: "tagline", label: "Slogan", placeholder: "Restaurante e Pizzaria" },
  { key: "phone", label: "Telefone", placeholder: "Ainda não informado" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "Ainda não informado" },
  { key: "instagram", label: "Instagram", placeholder: "Ainda não informado" },
  { key: "address", label: "Endereço", placeholder: "Ainda não informado" },
  { key: "openingHours", label: "Horário de funcionamento", placeholder: "Ainda não informado" },
];

function RestaurantTab() {
  const queryClient = useQueryClient();
  const catalogQuery = useQuery({ queryKey: ["admin", "catalog"], queryFn: adminApi.catalog });
  const info = catalogQuery.data?.restaurant;
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);

  const current =
    form ??
    (info
      ? Object.fromEntries(
          RESTAURANT_FIELDS.map((f) => [
            f.key,
            ((info as unknown as Record<string, string | null>)[f.key] ?? "") as string,
          ]),
        )
      : null);

  if (!current) return <Loader2 className="size-5 animate-spin text-zinc-400" aria-hidden />;

  return (
    <div className="max-w-xl space-y-3">
      {RESTAURANT_FIELDS.map((field) => (
        <div key={field.key} className="grid gap-1.5">
          <Label htmlFor={`rest-${field.key}`}>{field.label}</Label>
          <Input
            id={`rest-${field.key}`}
            data-testid={`admin-restaurant-${field.key}`}
            value={current[field.key] ?? ""}
            placeholder={field.placeholder}
            onChange={(e) =>
              setForm({ ...(current as Record<string, string>), [field.key]: e.target.value })
            }
            className="border-zinc-800 bg-zinc-950"
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          data-testid="admin-restaurant-save"
          disabled={busy}
          className="bg-orange-600 text-white hover:bg-orange-500"
          onClick={async () => {
            setBusy(true);
            try {
              const patch: Record<string, string | null> = {};
              for (const field of RESTAURANT_FIELDS) {
                patch[field.key] = (current[field.key] ?? "").trim() || null;
              }
              await adminApi.updateRestaurant(patch);
              await queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
              await queryClient.invalidateQueries({ queryKey: ["catalog"] });
              toast.success("Informações salvas");
            } catch (err) {
              const detail = ((err as ApiError)?.body as { detail?: string } | undefined)?.detail;
              toast.error(detail ?? "Não foi possível salvar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save className="mr-1.5 size-4" aria-hidden />
          Salvar informações
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500">
          <Upload className="size-4" aria-hidden />
          Trocar logo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            data-testid="admin-upload-logo"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const { url } = await adminApi.uploadImage(file);
                await adminApi.updateRestaurant({ logo: url });
                await queryClient.invalidateQueries({ queryKey: ["admin", "catalog"] });
                await queryClient.invalidateQueries({ queryKey: ["catalog"] });
                toast.success("Logo atualizada");
              } catch (err) {
                toast.error((err as Error).message ?? "Falha no upload.");
              }
            }}
          />
        </label>
      </div>
      <p className="text-xs text-zinc-500">
        Campos vazios aparecem como “A informar” no site — nada é inventado.
      </p>
    </div>
  );
}
