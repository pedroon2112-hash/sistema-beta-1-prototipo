import { API_ORIGIN_URL } from "@/lib/api";

// Formatação pt-BR. Dinheiro chega em CENTAVOS inteiros do backend.

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** '2026-09-20' -> '20/09/2026' */
export function formatDateBR(dateIso: string): string {
  const [y, m, d] = dateIso.split("-");
  return `${d}/${m}/${y}`;
}

/** Busca o PDF no Render e baixa o arquivo real, inclusive em outra origem. */
export async function downloadComanda(url: string, filename: string): Promise<void> {
  const target = new URL(url, API_ORIGIN_URL || window.location.origin);
  const response = await fetch(target.toString(), { credentials: "include" });
  if (!response.ok) throw new Error("Falha ao baixar comanda");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
