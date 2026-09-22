import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategoryNav from "@/components/menu/CategoryNav";
import FeaturedCarousel from "@/components/menu/FeaturedCarousel";
import ProductCard from "@/components/menu/ProductCard";
import ProductConfigSheet from "@/components/menu/ProductConfigSheet";
import CartBar from "@/components/cart/CartBar";
import CartDrawer from "@/components/cart/CartDrawer";
import CheckoutDialog from "@/components/delivery/CheckoutDialog";
import { useOrder } from "@/context/OrderContext";
import { cartToOrderItems, useCart } from "@/lib/cart";
import { apiPost, ApiError } from "@/lib/api";
import { CATALOG_KEY, featuredProducts, productsByCategory, useCatalog } from "@/data/catalog";
import type { DeliveryInfo, Order, OrderCreatePayload, PaymentMethod, Product } from "@/data/types";
import { downloadComanda, formatCents } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";

// Cardápio único (Local e Delivery) alimentado pelo SQLite via /api/catalog.
export default function Menu() {
  const { mode, tableLabel } = useOrder();
  const cart = useCart();
  const queryClient = useQueryClient();
  const { data: catalog, isLoading, isError } = useCatalog();

  const [configProduct, setConfigProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [cartAlert, setCartAlert] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  // Chave de idempotência por tentativa: clique duplo não cria duas comandas.
  const idempotencyRef = useRef<string>("");

  const categories = catalog?.categories ?? [];
  const featured = useMemo(() => featuredProducts(catalog), [catalog]);

  useEffect(() => {
    if (!activeCategory && categories.length > 0) setActiveCategory(categories[0].id);
  }, [categories, activeCategory]);

  useEffect(() => {
    if (categories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveCategory(entry.target.id.replace("cat-", ""));
        }
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    for (const category of categories) {
      const el = document.getElementById(`cat-${category.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [categories]);

  if (!mode) return <Navigate to="/" replace />;

  if (placedOrder) {
    return (
      <OrderPlaced
        order={placedOrder}
        onBackToMenu={() => setPlacedOrder(null)}
      />
    );
  }

  const scrollToCategory = (id: string) => {
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth" });
  };

  async function submitOrder({
    payment,
    delivery,
  }: {
    payment: PaymentMethod;
    delivery?: DeliveryInfo;
  }) {
    if (submitting) return;
    if (!mode) return;
    setSubmitting(true);
    setServerError(null);

    if (!idempotencyRef.current) {
      idempotencyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
    }

    const payload: OrderCreatePayload = {
      mode,
      tableLabel: mode === "local" ? tableLabel : null,
      delivery:
        mode === "delivery" && delivery
          ? {
              name: delivery.name,
              phone: delivery.phone,
              address: delivery.address,
              number: delivery.number,
              complement: delivery.complement || null,
              reference: delivery.reference || null,
            }
          : null,
      paymentMethod: payment,
      items: cartToOrderItems(cart.items),
      expectedTotalCents: cart.subtotalCents,
      idempotencyKey: idempotencyRef.current,
    };

    try {
      const order = await apiPost<Order>("/orders", payload);
      // Só agora o pedido existe de verdade: limpa carrinho e mostra o número.
      cart.clear();
      idempotencyRef.current = "";
      setCheckoutOpen(false);
      setCartAlert(null);
      setPlacedOrder(order);
      // Download automático da comanda; se falhar, o botão continua disponível.
      try {
        downloadComanda(order.comandaUrl, order.comandaFilename);
      } catch {
        toast.error("Não foi possível iniciar o download. Use o botão Baixar comanda.");
      }
    } catch (err) {
      const apiErr = err as ApiError;
      const body = apiErr?.body as
        | { detail?: string | { code?: string; message?: string } }
        | undefined;
      const detail = body?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : detail?.message ?? "Não foi possível enviar o pedido. Tente novamente.";

      const code = typeof detail === "object" ? detail?.code : undefined;
      if (code === "price_changed" || code === "product_unavailable" || code === "product_not_found") {
        // Carrinho NÃO é limpo: o cliente revisa antes de confirmar (§31/§33)
        idempotencyRef.current = "";
        setCheckoutOpen(false);
        setCartAlert(message);
        setCartOpen(true);
        await queryClient.invalidateQueries({ queryKey: CATALOG_KEY });
        toast.error(message);
      } else {
        setServerError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100">
      <Header cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      {categories.length > 0 && (
        <CategoryNav
          categories={categories}
          activeId={activeCategory}
          onSelect={scrollToCategory}
        />
      )}

      <main className="mx-auto max-w-5xl px-4 pb-36">
        {featured.length > 0 && (
          <section className="pt-5">
            <FeaturedCarousel products={featured} onOpen={setConfigProduct} />
          </section>
        )}

        {isLoading && (
          <p data-testid="menu-loading" className="py-10 text-center text-zinc-400">
            <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />
            Carregando cardápio...
          </p>
        )}

        {isError && (
          <p
            data-testid="menu-error"
            className="mt-6 rounded-xl border border-amber-600/50 bg-amber-950/30 p-4 text-sm text-amber-200"
          >
            Não foi possível carregar o cardápio agora. Verifique sua conexão e tente
            novamente.
          </p>
        )}

        {categories.map((category) => {
          const products = productsByCategory(catalog?.products ?? [], category.id);
          if (products.length === 0) return null;
          return (
            <section
              key={category.id}
              id={`cat-${category.id}`}
              data-testid={`menu-section-${category.id}`}
              className="scroll-mt-32 pt-8"
            >
              <h2 className="font-heading text-xl font-bold tracking-tight text-zinc-50">
                {category.label}
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} onOpen={setConfigProduct} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <Footer />

      <CartBar
        count={cart.count}
        subtotalCents={cart.subtotalCents}
        onOpenCart={() => setCartOpen(true)}
      />

      <ProductConfigSheet
        product={configProduct}
        open={configProduct !== null}
        onOpenChange={(open) => {
          if (!open) setConfigProduct(null);
        }}
        onAdd={cart.addItem}
      />

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        alert={cartAlert}
        onCheckout={() => {
          setCartOpen(false);
          setServerError(null);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        mode={mode}
        tableLabel={tableLabel}
        totalCents={cart.subtotalCents}
        submitting={submitting}
        errorMessage={serverError}
        onSubmit={submitOrder}
      />
    </div>
  );
}

function OrderPlaced({
  order,
  onBackToMenu,
}: {
  order: Order;
  onBackToMenu: () => void;
}) {
  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div
          data-testid="order-placed"
          className="rounded-2xl border border-emerald-700/50 bg-emerald-950/20 p-5 text-center"
        >
          <CheckCircle2 className="mx-auto size-10 text-emerald-400" aria-hidden />
          <h1 className="mt-2 font-heading text-2xl font-bold text-zinc-50">
            PEDIDO REALIZADO
          </h1>
          <p data-testid="order-number" className="mt-1 font-heading text-lg text-orange-400">
            {order.kind === "local" ? "Pedido Local" : "Pedido Delivery"} {order.number}
          </p>
          {order.tableLabel && (
            <p data-testid="order-table" className="text-sm text-zinc-300">
              {order.tableLabel}
            </p>
          )}
          <p className="mt-2 text-zinc-200">
            Total:{" "}
            <span data-testid="order-total" className="font-bold">
              {formatCents(order.totalCents)}
            </span>
          </p>
          <p data-testid="order-payment" className="text-sm text-zinc-400">
            Pagamento: {order.paymentLabel}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="text-xs font-semibold tracking-widest text-orange-500 uppercase">
            Itens registrados
          </h2>
          <ul className="mt-2 space-y-2">
            {order.items.map((item, index) => (
              <li
                key={`${item.productId}-${index}`}
                data-testid={`placed-item-${index}`}
                className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-100">
                    {item.quantity}x {item.productName}
                    {item.variantLabel ? ` — ${item.variantLabel}` : ""}
                  </span>
                  <span className="font-bold text-orange-500">
                    {formatCents(item.subtotalCents)}
                  </span>
                </div>
                {item.options
                  .filter((o) => o.noExtraCost)
                  .map((o) => (
                    <p key={o.optionLabel} className="text-xs text-zinc-400">
                      {o.groupLabel}: {o.optionLabel}
                    </p>
                  ))}
                {item.options
                  .filter((o) => !o.noExtraCost)
                  .map((o) => (
                    <p key={o.optionLabel} className="text-xs text-zinc-400">
                      + {o.quantity}x {o.optionLabel}
                    </p>
                  ))}
                {item.note && (
                  <p className="text-xs text-orange-400/90 italic">Obs.: {item.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            data-testid="download-comanda-btn"
            onClick={() => downloadComanda(order.comandaUrl, order.comandaFilename)}
            className="h-12 bg-orange-600 font-heading text-base font-bold text-white hover:bg-orange-500"
          >
            <Download className="mr-2 size-4" aria-hidden />
            Baixar comanda
          </Button>
          <Button
            data-testid="new-order-btn"
            variant="outline"
            onClick={onBackToMenu}
            className="h-12"
          >
            Fazer outro pedido
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
