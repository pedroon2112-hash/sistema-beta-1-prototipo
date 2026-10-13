import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import Footer from "@/components/layout/Footer";
import { useOrder } from "@/context/OrderContext";
import { useCatalog } from "@/data/catalog";

// Seleção de mesa do modo No Local. A mesa é apenas identificação — nunca
// existe estado livre/ocupada para o cliente. Aceita ?mesa=N (QR Code).
export default function TableSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setLocalMode } = useOrder();
  const { data: catalog } = useCatalog();
  const tables = catalog?.tables ?? [];

  const mesaParam = (searchParams.get("mesa") ?? "").trim();
  // A mesa do QR Code só é aceita se existir no cadastro do banco.
  const qrTable = tables.find(
    (t) => t.label === `Mesa ${mesaParam}` || t.label === mesaParam,
  );
  const [table, setTable] = useState<string | null>(null);
  const selectedLabel = table ?? qrTable?.label ?? null;
  const fromQr = Boolean(qrTable) && table === null;

  return (
    <div className="flex min-h-svh flex-col bg-[#fffaf3] text-[#33251e]">
      <header className="border-b border-[#e9d7c2]/80 bg-[#fffaf3]/90">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link
            to="/"
            data-testid="back-home-link"
            aria-label="Voltar ao início"
            className="flex size-10 items-center justify-center rounded-lg border border-[#e9d7c2] text-[#604737] transition-colors hover:border-zinc-600"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <h1 className="font-heading text-lg font-bold text-[#33251e]">
            No local
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex items-center gap-2 text-[#b94f19]">
          <MapPin className="size-5" aria-hidden />
          <h2 className="font-heading text-xl font-bold tracking-tight text-[#33251e]">
            Selecione sua mesa
          </h2>
        </div>
        <p className="mt-1 text-sm text-[#72594a]">
          Toque no número da mesa onde você está sentado.
        </p>

        {fromQr && (
          <p
            data-testid="table-qr-hint"
            className="mt-3 rounded-lg border border-[#b94f19]/50 bg-[#fff0d7]/30 px-3 py-2 text-sm text-[#9c4519]"
          >
            Identificamos sua mesa pelo link — {qrTable?.label} já selecionada.
          </p>
        )}

        <div
          data-testid="table-select-grid"
          className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4"
        >
          {tables.map((t) => {
            const selected = selectedLabel === t.label;
            const shortLabel = t.label.replace(/^Mesa\s*/i, "");
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`table-option-btn-${shortLabel}`}
                aria-pressed={selected}
                onClick={() => setTable(t.label)}
                className={`flex h-20 flex-col items-center justify-center rounded-xl border transition-colors duration-200 ${
                  selected
                    ? "border-[#b94f19] bg-[#b94f19] text-white shadow-lg shadow-orange-950/40"
                    : "border-[#e9d7c2] bg-white/80 text-[#4a2d1f] hover:border-zinc-600"
                }`}
              >
                <span className="font-heading text-lg font-bold">Mesa</span>
                <span className="font-heading text-2xl font-black">{shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="sticky bottom-4 mt-6">
          <button
            type="button"
            data-testid="table-confirm-btn"
            disabled={selectedLabel === null}
            onClick={() => {
              if (selectedLabel !== null) {
                setLocalMode(selectedLabel);
                navigate("/cardapio");
              }
            }}
            className="h-14 w-full rounded-xl bg-[#b94f19] font-heading text-base font-bold text-white shadow-lg shadow-orange-950/50 transition-colors duration-200 hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selectedLabel === null
              ? "Escolha uma mesa para continuar"
              : `Entrar no cardápio — ${selectedLabel}`}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
