import { useNavigate } from "react-router-dom";
import { Bike, ChevronRight, UtensilsCrossed } from "lucide-react";
import Footer from "@/components/layout/Footer";
import { useOrder } from "@/context/OrderContext";
import { useCatalog, FALLBACK_RESTAURANT } from "@/data/catalog";

// Tela inicial: identidade + escolha do tipo de pedido. Sem cadastro, sem
// login — o cliente escolhe NO LOCAL ou DELIVERY e segue direto.
export default function Home() {
  const navigate = useNavigate();
  const { setDeliveryMode } = useOrder();
  const { data: catalog } = useCatalog();
  const info = catalog?.restaurant ?? FALLBACK_RESTAURANT;

  return (
    <div className="flex min-h-svh flex-col bg-zinc-950 text-zinc-100">
      <section className="relative overflow-hidden">
        <img
          src={info.heroImage}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 pt-14 pb-10 text-center sm:pt-20 sm:pb-14">
          <img
            data-testid="home-logo"
            src={info.logo}
            alt={`Logo ${info.name}`}
            className="h-28 w-28 rounded-2xl object-contain shadow-2xl shadow-orange-950/40 sm:h-36 sm:w-36"
          />
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            GalegonN
          </h1>
          <p className="text-xs font-semibold tracking-[0.25em] text-orange-500 uppercase sm:text-sm">
            {info.tagline}
          </p>
          <p className="max-w-md text-sm text-zinc-300 sm:text-base">
            Comida de verdade e pizza na hora. Monte seu pedido em segundos.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl flex-1 px-4 pb-14">
        <h2 className="sr-only">Como você quer pedir?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            data-testid="mode-local-button"
            onClick={() => navigate("/local")}
            className="group flex flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 text-left transition-colors duration-200 hover:border-orange-600/60"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-orange-600/15 text-orange-500">
              <UtensilsCrossed className="size-6" aria-hidden />
            </span>
            <span>
              <span className="flex items-center justify-between font-heading text-2xl font-bold text-zinc-50">
                NO LOCAL
                <ChevronRight
                  className="size-5 text-orange-500 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-sm text-zinc-400">
                Está comendo aqui? Informe sua mesa e peça sem fila.
              </span>
            </span>
          </button>

          <button
            type="button"
            data-testid="mode-delivery-button"
            onClick={() => {
              setDeliveryMode();
              navigate("/cardapio");
            }}
            className="group flex flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 text-left transition-colors duration-200 hover:border-orange-600/60"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-orange-600/15 text-orange-500">
              <Bike className="size-6" aria-hidden />
            </span>
            <span>
              <span className="flex items-center justify-between font-heading text-2xl font-bold text-zinc-50">
                DELIVERY
                <ChevronRight
                  className="size-5 text-orange-500 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-sm text-zinc-400">
                Quer receber em casa? Mesmo cardápio, entregamos pra você.
              </span>
            </span>
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500">
          Sem cadastro. Sem login. É só escolher e pedir.
        </p>
      </section>

      <Footer />
    </div>
  );
}
