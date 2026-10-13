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
    <div className="flex min-h-svh flex-col bg-[#18110e] text-[#fff9f0]">
      <section className="relative flex flex-1 flex-col overflow-hidden bg-[#18110e]">
        <img
          src={info.heroImage}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#18110e]/35 via-[#18110e]/65 to-[#18110e]/95" />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 pt-12 pb-6 text-center sm:pt-16 sm:pb-8">
          <img
            data-testid="home-logo"
            src={info.logo}
            alt={`Logo ${info.name}`}
            className="h-28 w-28 rounded-2xl object-contain shadow-2xl shadow-black/40 sm:h-36 sm:w-36"
          />
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[#fff9f0] sm:text-5xl">
            GalegonN
          </h1>
          <p className="text-xs font-semibold tracking-[0.25em] text-[#ff8a25] uppercase sm:text-sm">
            {info.tagline}
          </p>
          <p className="max-w-md text-sm text-[#fff0e2] drop-shadow-md sm:text-base">
            Comida de verdade e pizza na hora. Monte seu pedido em segundos.
          </p>
        </div>
      <div className="relative mx-auto w-full max-w-3xl flex-1 px-4 pt-2 pb-12 sm:pt-3 sm:pb-14">
        <h2 className="sr-only">Como você quer pedir?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            data-testid="mode-local-button"
            onClick={() => navigate("/local")}
            className="group flex flex-col gap-6 rounded-2xl border border-[#b96a2a]/65 bg-[#302019]/90 p-6 text-left shadow-lg shadow-black/20 backdrop-blur-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#ff8a25] hover:bg-[#493025] hover:shadow-xl hover:shadow-black/30"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-[#b94f19]/35 text-[#ff8a25]">
              <UtensilsCrossed className="size-6" aria-hidden />
            </span>
            <span>
              <span className="flex items-center justify-between font-heading text-2xl font-bold text-[#fff9f0]">
                NO LOCAL
                <ChevronRight
                  className="size-5 text-[#ff8a25] transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-sm text-[#ead6c7]">
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
            className="group flex flex-col gap-6 rounded-2xl border border-[#b96a2a]/65 bg-[#302019]/90 p-6 text-left shadow-lg shadow-black/20 backdrop-blur-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#ff8a25] hover:bg-[#493025] hover:shadow-xl hover:shadow-black/30"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-[#b94f19]/35 text-[#ff8a25]">
              <Bike className="size-6" aria-hidden />
            </span>
            <span>
              <span className="flex items-center justify-between font-heading text-2xl font-bold text-[#fff9f0]">
                DELIVERY
                <ChevronRight
                  className="size-5 text-[#ff8a25] transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-sm text-[#ead6c7]">
                Quer receber em casa? Mesmo cardápio, entregamos pra você.
              </span>
            </span>
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-[#e9d7c2]">
          Sem cadastro. Sem login. É só escolher e pedir.
        </p>
      </div>
      </section>

      <Footer />
    </div>
  );
}
