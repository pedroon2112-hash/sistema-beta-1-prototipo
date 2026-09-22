import { Clock, Instagram, Lock, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useCatalog, FALLBACK_RESTAURANT } from "@/data/catalog";

// Rodapé GLOBAL — informações vêm do SQLite (editáveis no Admin).
// Campo ainda não preenchido aparece como placeholder claro: nada inventado.

function InfoRow({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  testId: string;
}) {
  return (
    <div className="flex items-start gap-2.5" data-testid={testId}>
      <span className="mt-0.5 text-orange-500" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-zinc-300">{label}</p>
        {value ? (
          <p className="break-words text-zinc-400">{value}</p>
        ) : (
          <p className="italic text-zinc-500">A informar</p>
        )}
      </div>
    </div>
  );
}

export default function Footer() {
  const { data } = useCatalog();
  const info = data?.restaurant ?? FALLBACK_RESTAURANT;

  return (
    <footer
      data-testid="footer"
      className="border-t border-zinc-800/80 bg-zinc-950 pb-24 md:pb-10"
    >
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <img
            src={info.logo}
            alt={`Logo ${info.name}`}
            className="h-16 w-16 rounded-lg object-contain"
          />
          <div>
            <p className="font-heading text-lg font-bold text-zinc-50">GalegonN</p>
            <p className="text-sm uppercase tracking-widest text-orange-500">
              {info.tagline}
            </p>
          </div>
          <p className="max-w-xs text-sm text-zinc-500">
            Faça seu pedido no local pelo nosso cardápio digital ou receba em casa no
            modo delivery.
          </p>
        </div>

        <div className="grid gap-4">
          <InfoRow
            icon={<Instagram className="size-4" />}
            label="Instagram"
            value={info.instagram}
            testId="footer-instagram"
          />
          <InfoRow
            icon={<Phone className="size-4" />}
            label="Telefone / WhatsApp"
            value={info.whatsapp ?? info.phone}
            testId="footer-phone"
          />
          <InfoRow
            icon={<MapPin className="size-4" />}
            label="Endereço"
            value={info.address}
            testId="footer-address"
          />
          <InfoRow
            icon={<Clock className="size-4" />}
            label="Horário de funcionamento"
            value={info.openingHours}
            testId="footer-hours"
          />
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400 sm:max-w-xs">
            <p className="font-medium text-zinc-200">Pedidos digitais</p>
            <p className="mt-1">
              Peça direto pelo cardápio: o pedido é registrado e a comanda é gerada
              na hora.
            </p>
          </div>
          <Link
            to="/admin"
            data-testid="footer-admin-link"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-orange-500"
          >
            <Lock className="size-3" aria-hidden />
            Admin
          </Link>
        </div>
      </div>

      <div className="border-t border-zinc-800/60 py-4">
        <p className="text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} GalegonN Restaurante e Pizzaria
        </p>
      </div>
    </footer>
  );
}
