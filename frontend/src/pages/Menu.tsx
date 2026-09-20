import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategoryNav from "@/components/menu/CategoryNav";
import FeaturedCarousel from "@/components/menu/FeaturedCarousel";
import ProductCard from "@/components/menu/ProductCard";
import ProductConfigSheet from "@/components/menu/ProductConfigSheet";
import CartBar from "@/components/cart/CartBar";
import CartDrawer from "@/components/cart/CartDrawer";
import DeliveryForm from "@/components/delivery/DeliveryForm";
import { useOrder } from "@/context/OrderContext";
import { useCart } from "@/lib/cart";
import type { CartItem, DeliveryInfo, Product } from "@/data/types";
import { CATEGORIES, featuredProducts, productsByCategory } from "@/data/menu";
import { formatBRL } from "@/lib/format";

// Cardápio único — compartilhado entre No Local e Delivery. Somente o
// contexto de finalização muda entre os modos.
export default function Menu() {
  const { mode, tableNumber } = useOrder();
  const cart = useCart();
  const [configProduct, setConfigProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [review, setReview] = useState<{
    info: DeliveryInfo;
    items: CartItem[];
    total: number;
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const featured = useMemo(featuredProducts, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id.replace("cat-", ""));
          }
        }
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    for (const category of CATEGORIES) {
      const el = document.getElementById(`cat-${category.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  if (!mode) return <Navigate to="/" replace />;

  if (review) {
    return (
      <OrderReview
        info={review.info}
        items={review.items}
        total={review.total}
        onBack={() => setReview(null)}
      />
    );
  }

  const scrollToCategory = (id: string) => {
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100">
      <Header cartCount={cart.count} onOpenCart={() => setCartOpen(true)} />
      <CategoryNav
        categories={CATEGORIES}
        activeId={activeCategory}
        onSelect={scrollToCategory}
      />

      <main className="mx-auto max-w-5xl px-4 pb-36">
        {featured.length > 0 && (
          <section className="pt-5">
            <FeaturedCarousel
              products={featured}
              onOpen={setConfigProduct}
            />
          </section>
        )}

        {CATEGORIES.map((category) => {
          const products = productsByCategory(category.id);
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
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpen={setConfigProduct}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <Footer />

      <CartBar
        count={cart.count}
        subtotal={cart.subtotal}
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
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <DeliveryForm
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onSubmit={(info) => {
          setCheckoutOpen(false);
          setReview({ info, items: cart.items, total: cart.subtotal });
        }}
      />
    </div>
  );
}

interface OrderReviewProps {
  info: DeliveryInfo;
  items: CartItem[];
  total: number;
  onBack: () => void;
}

// Revisão do pedido delivery — snapshot completo do que será enviado ao
// backend no Prompt 2. Aviso honesto: nada é enviado nesta etapa.
function OrderReview({ info, items, total, onBack }: OrderReviewProps) {
  return (
    <div className="min-h-svh bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-50">
          Revisão do pedido
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Confira as informações da entrega e os itens.
        </p>

        <div
          data-testid="order-confirmation-summary"
          className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
        >
          <h2 className="text-xs font-semibold tracking-widest text-orange-500 uppercase">
            Entrega
          </h2>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <SummaryRow label="Nome" value={info.name} />
            <SummaryRow label="Telefone" value={info.phone} />
            <SummaryRow
              label="Endereço"
              value={`${info.address}, ${info.number}`}
            />
            {info.complement && (
              <SummaryRow label="Complemento" value={info.complement} />
            )}
            {info.reference && (
              <SummaryRow label="Referência" value={info.reference} />
            )}
            <SummaryRow
              label="Pagamento"
              value={PAYMENT_LABELS[info.paymentMethod] ?? info.paymentMethod}
            />
          </dl>

          <h2 className="mt-4 text-xs font-semibold tracking-widest text-orange-500 uppercase">
            Itens
          </h2>
          <ul className="mt-2 space-y-2">
            {items.map((item, index) => (
              <li
                key={item.cartItemId}
                data-testid={`review-item-${index}`}
                className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-100">
                    {item.quantity}x {item.productName}
                    {item.variantLabel ? ` — ${item.variantLabel}` : ""}
                  </span>
                  <span className="font-bold text-orange-500">
                    {formatBRL(
                      (item.baseUnitPrice +
                        item.selectedOptions
                          .filter((o) => !o.noExtraCost)
                          .reduce(
                            (s, o) => s + o.unitPrice * o.quantity,
                            0,
                          )) *
                        item.quantity,
                    )}
                  </span>
                </div>
                {item.selectedOptions
                  .filter((o) => o.noExtraCost && o.groupId === "sabor")
                  .map((o) => (
                    <p key={o.optionId} className="text-xs text-zinc-400">
                      Sabor: {o.optionLabel}
                    </p>
                  ))}
                {item.selectedOptions.filter(
                  (o) => o.noExtraCost && o.groupId !== "sabor",
                ).length > 0 && (
                  <p className="text-xs text-zinc-400">
                    Inclusos:{" "}
                    {item.selectedOptions
                      .filter((o) => o.noExtraCost && o.groupId !== "sabor")
                      .map((o) => o.optionLabel)
                      .join(", ")}
                  </p>
                )}
                {item.selectedOptions
                  .filter((o) => !o.noExtraCost)
                  .map((o) => (
                    <p key={o.optionId} className="text-xs text-zinc-400">
                      + {o.quantity}x {o.optionLabel}
                    </p>
                  ))}
                {item.note && (
                  <p className="text-xs text-orange-400/90 italic">
                    Obs.: {item.note}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 font-heading text-lg font-bold text-zinc-50">
            <span>Total</span>
            <span data-testid="review-total">{formatBRL(total)}</span>
          </div>
        </div>

        <div
          data-testid="no-send-notice"
          className="mt-4 rounded-xl border border-amber-600/50 bg-amber-950/30 p-4 text-sm"
        >
          <p className="flex items-center gap-2 font-semibold text-amber-300">
            <Info className="size-4 shrink-0" aria-hidden />
            Pedido não enviado
          </p>
          <p className="mt-1 text-amber-200/90">
            Este site ainda não envia pedidos ao restaurante — o envio online
            será ativado em breve. Nenhum pedido foi registrado agora.
          </p>
        </div>

        <Button
          data-testid="back-to-menu-btn"
          onClick={onBack}
          className="mt-6 h-12 w-full bg-orange-600 font-heading text-base font-bold text-white hover:bg-orange-500"
        >
          Voltar ao cardápio
        </Button>
      </main>
      <Footer />
    </div>
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  "cartao-credito": "Cartão de crédito",
  "cartao-debito": "Cartão de débito",
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-zinc-200">{value}</dd>
    </div>
  );
}
