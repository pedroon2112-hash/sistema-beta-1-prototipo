import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import Footer from "@/components/layout/Footer";
import { useOrder } from "@/context/OrderContext";

const TOTAL_TABLES = 12;

// Seleção de mesa do modo No Local. A mesa é apenas identificação — nunca
// existe estado livre/ocupada para o cliente. Aceita ?mesa=N (QR Code).
export default function TableSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setLocalMode } = useOrder();

  const mesaParam = Number(searchParams.get("mesa"));
  const fromQr =
    Number.isInteger(mesaParam) && mesaParam >= 1 && mesaParam <= TOTAL_TABLES;
  const [table, setTable] = useState<number | null>(
    fromQr ? mesaParam : null,
  );

  return (
    <div className="flex min-h-svh flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link
            to="/"
            data-testid="back-home-link"
            aria-label="Voltar ao início"
            className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 transition-colors hover:border-zinc-600"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <h1 className="font-heading text-lg font-bold text-zinc-50">
            No local
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex items-center gap-2 text-orange-500">
          <MapPin className="size-5" aria-hidden />
          <h2 className="font-heading text-xl font-bold tracking-tight text-zinc-50">
            Selecione sua mesa
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Toque no número da mesa onde você está sentado.
        </p>

        {fromQr && (
          <p
            data-testid="table-qr-hint"
            className="mt-3 rounded-lg border border-orange-600/50 bg-orange-950/30 px-3 py-2 text-sm text-orange-300"
          >
            Identificamos sua mesa pelo link — Mesa {mesaParam} já selecionada.
          </p>
        )}

        <div
          data-testid="table-select-grid"
          className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4"
        >
          {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map((n) => {
            const selected = table === n;
            return (
              <button
                key={n}
                type="button"
                data-testid={`table-option-btn-${n}`}
                aria-pressed={selected}
                onClick={() => setTable(n)}
                className={`flex h-20 flex-col items-center justify-center rounded-xl border transition-colors duration-200 ${
                  selected
                    ? "border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-950/40"
                    : "border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:border-zinc-600"
                }`}
              >
                <span className="font-heading text-lg font-bold">Mesa</span>
                <span className="font-heading text-2xl font-black">{n}</span>
              </button>
            );
          })}
        </div>

        <div className="sticky bottom-4 mt-6">
          <button
            type="button"
            data-testid="table-confirm-btn"
            disabled={table === null}
            onClick={() => {
              if (table !== null) {
                setLocalMode(table);
                navigate("/cardapio");
              }
            }}
            className="h-14 w-full rounded-xl bg-orange-600 font-heading text-base font-bold text-white shadow-lg shadow-orange-950/50 transition-colors duration-200 hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {table === null
              ? "Escolha uma mesa para continuar"
              : `Entrar no cardápio — Mesa ${table}`}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
