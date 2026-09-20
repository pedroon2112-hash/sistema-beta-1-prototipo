import { Clock, Instagram, MapPin, Phone } from "lucide-react";
import { restaurantInfo } from "@/data/menu";

// Rodapé GLOBAL — todas as páginas reutilizam este componente.
// Informações oficiais ainda não fornecidas aparecem como placeholders
// claramente identificados ("A informar") — nada inventado.

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
          <p className="text-zinc-400">{value}</p>
        ) : (
          <p className="italic text-zinc-500">
            A informar — dado oficial ainda não fornecido
          </p>
        )}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer
      data-testid="footer"
      className="border-t border-zinc-800/80 bg-zinc-950 pb-24 md:pb-10"
    >
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <img
            src={restaurantInfo.logo}
            alt={`Logo ${restaurantInfo.name}`}
            className="h-16 w-16 rounded-lg"
          />
          <div>
            <p className="font-heading text-lg font-bold text-zinc-50">
              GalegonN
            </p>
            <p className="text-sm uppercase tracking-widest text-orange-500">
              Restaurante e Pizzaria
            </p>
          </div>
          <p className="max-w-xs text-sm text-zinc-500">
            Faça seu pedido no local pelo nosso cardápio digital ou receba em
            casa no modo delivery.
          </p>
        </div>

        <div className="grid gap-4">
          <InfoRow
            icon={<Instagram className="size-4" />}
            label="Instagram"
            value={restaurantInfo.instagram}
            testId="footer-instagram"
          />
          <InfoRow
            icon={<Phone className="size-4" />}
            label="Telefone / WhatsApp"
            value={restaurantInfo.whatsapp ?? restaurantInfo.phone}
            testId="footer-phone"
          />
          <InfoRow
            icon={<MapPin className="size-4" />}
            label="Endereço"
            value={restaurantInfo.address}
            testId="footer-address"
          />
          <InfoRow
            icon={<Clock className="size-4" />}
            label="Horário de funcionamento"
            value={restaurantInfo.openingHours}
            testId="footer-hours"
          />
        </div>

        <div className="flex flex-col gap-3 sm:items-end lg:items-end">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400 sm:max-w-xs">
            <p className="font-medium text-zinc-200">Pedidos digitais</p>
            <p className="mt-1">
              Em breve: envio online do pedido e comanda automática. Por
              enquanto, este cardápio é a vitrine e o organizador do seu pedido.
            </p>
          </div>
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
