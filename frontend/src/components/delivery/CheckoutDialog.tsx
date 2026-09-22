import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DeliveryInfo, PaymentMethod } from "@/data/types";
import { PAYMENT_OPTIONS } from "@/data/types";
import { formatCents, formatPhone } from "@/lib/format";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "local" | "delivery";
  tableLabel: string | null;
  totalCents: number;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (data: { payment: PaymentMethod; delivery?: DeliveryInfo }) => void;
}

// Finalização real: escolhe pagamento (e dados de entrega no delivery).
// Validação no frontend E no backend; o botão bloqueia durante o envio (§32).
export default function CheckoutDialog({
  open,
  onOpenChange,
  mode,
  tableLabel,
  totalCents,
  submitting,
  errorMessage,
  onSubmit,
}: CheckoutDialogProps) {
  const [payment, setPayment] = useState<PaymentMethod | "">("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSubmit() {
    const next: Record<string, string> = {};
    if (!payment) next.payment = "Selecione a forma de pagamento";
    if (mode === "delivery") {
      if (name.trim().length < 3) next.name = "Informe seu nome completo";
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 11)
        next.phone = "Informe um telefone com DDD";
      if (address.trim().length < 5) next.address = "Informe sua rua";
      if (!number.trim()) next.number = "Obrigatório";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      payment: payment as PaymentMethod,
      delivery:
        mode === "delivery"
          ? {
              name: name.trim(),
              phone: phone.replace(/\D/g, ""),
              address: address.trim(),
              number: number.trim(),
              complement: complement.trim(),
              reference: reference.trim(),
            }
          : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent
        data-testid="checkout-dialog"
        className="max-h-[92svh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-zinc-50">
            {mode === "local" ? `Finalizar — ${tableLabel ?? "Mesa"}` : "Entrega"}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            Total do pedido:{" "}
            <span data-testid="checkout-total" className="font-bold text-orange-500">
              {formatCents(totalCents)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {mode === "delivery" && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="delivery-name">Nome</Label>
                <Input
                  id="delivery-name"
                  data-testid="delivery-form-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearError("name");
                  }}
                  placeholder="Seu nome"
                  autoComplete="name"
                  className="border-zinc-800 bg-zinc-900"
                />
                {errors.name && (
                  <p data-testid="delivery-form-error-name" className="text-xs text-red-400">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="delivery-phone">Telefone / WhatsApp</Label>
                <Input
                  id="delivery-phone"
                  data-testid="delivery-form-phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhone(e.target.value));
                    clearError("phone");
                  }}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  autoComplete="tel"
                  className="border-zinc-800 bg-zinc-900"
                />
                {errors.phone && (
                  <p data-testid="delivery-form-error-phone" className="text-xs text-red-400">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="delivery-address">Endereço</Label>
                <Input
                  id="delivery-address"
                  data-testid="delivery-form-address"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    clearError("address");
                  }}
                  placeholder="Rua / Avenida"
                  autoComplete="street-address"
                  className="border-zinc-800 bg-zinc-900"
                />
                {errors.address && (
                  <p data-testid="delivery-form-error-address" className="text-xs text-red-400">
                    {errors.address}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="delivery-number">Número</Label>
                  <Input
                    id="delivery-number"
                    data-testid="delivery-form-number"
                    value={number}
                    onChange={(e) => {
                      setNumber(e.target.value);
                      clearError("number");
                    }}
                    placeholder="123"
                    inputMode="numeric"
                    className="border-zinc-800 bg-zinc-900"
                  />
                  {errors.number && (
                    <p data-testid="delivery-form-error-number" className="text-xs text-red-400">
                      {errors.number}
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="delivery-complement">Complemento</Label>
                  <Input
                    id="delivery-complement"
                    data-testid="delivery-form-complement"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Opcional"
                    className="border-zinc-800 bg-zinc-900"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="delivery-reference">Ponto de referência</Label>
                <Input
                  id="delivery-reference"
                  data-testid="delivery-form-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Opcional — ex.: perto da praça"
                  className="border-zinc-800 bg-zinc-900"
                />
              </div>
            </>
          )}

          <div className="grid gap-1.5">
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_OPTIONS.map((option) => {
                const selected = payment === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    data-testid={`payment-option-${option.value}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setPayment(option.value);
                      clearError("payment");
                    }}
                    className={`min-h-12 rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      selected
                        ? "border-orange-600 bg-orange-950/40 text-orange-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {errors.payment && (
              <p data-testid="checkout-error-payment" className="text-xs text-red-400">
                {errors.payment}
              </p>
            )}
          </div>

          {errorMessage && (
            <p
              data-testid="checkout-server-error"
              className="rounded-lg border border-red-600/60 bg-red-950/40 p-3 text-sm text-red-200"
            >
              {errorMessage}
            </p>
          )}
        </div>

        <Button
          data-testid="confirm-order-btn"
          onClick={handleSubmit}
          disabled={submitting}
          className="h-12 w-full bg-orange-600 font-heading text-base font-bold text-white hover:bg-orange-500 disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Enviando pedido...
            </>
          ) : (
            "Enviar pedido"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
