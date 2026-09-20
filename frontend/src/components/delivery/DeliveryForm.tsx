import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeliveryInfo } from "@/data/types";
import { formatPhone } from "@/lib/format";

interface DeliveryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (info: DeliveryInfo) => void;
}

const PAYMENT_OPTIONS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "cartao-credito", label: "Cartão de crédito" },
  { value: "cartao-debito", label: "Cartão de débito" },
];

// Formulário de entrega — dados que acompanharão o pedido e a comanda no
// Prompt 2. Aqui apenas valida e devolve as informações; nada é enviado.
export default function DeliveryForm({
  open,
  onOpenChange,
  onSubmit,
}: DeliveryFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [payment, setPayment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Limpa o erro do campo assim que o usuário corrige. */
  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): DeliveryInfo | null {
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = "Informe seu nome completo";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11)
      next.phone = "Informe um telefone com DDD (só números)";
    if (address.trim().length < 5) next.address = "Informe sua rua";
    if (!number.trim()) next.number = "Obrigatório";
    if (!payment) next.payment = "Selecione a forma de pagamento";
    setErrors(next);
    if (Object.keys(next).length > 0) return null;
    return {
      name: name.trim(),
      phone: digits,
      address: address.trim(),
      number: number.trim(),
      complement: complement.trim(),
      reference: reference.trim(),
      paymentMethod: payment,
    };
  }

  function handleSubmit() {
    const info = validate();
    if (info) onSubmit(info);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="delivery-form"
        className="max-h-[90svh] overflow-y-auto border-zinc-800 bg-zinc-950 sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-zinc-50">
            Entrega
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            Preencha seus dados para a entrega. Nada é enviado ainda — o envio
            online do pedido será ativado em breve.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
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
              <p
                data-testid="delivery-form-error-name"
                className="text-xs text-red-400"
              >
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
              <p
                data-testid="delivery-form-error-phone"
                className="text-xs text-red-400"
              >
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
              <p
                data-testid="delivery-form-error-address"
                className="text-xs text-red-400"
              >
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
                <p
                  data-testid="delivery-form-error-number"
                  className="text-xs text-red-400"
                >
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

          <div className="grid gap-1.5">
            <Label htmlFor="delivery-payment">Forma de pagamento</Label>
            <Select
              value={payment}
              onValueChange={(value: string) => {
                setPayment(value);
                clearError("payment");
              }}
            >
              <SelectTrigger
                id="delivery-payment"
                data-testid="payment-method-selector"
                className="w-full border-zinc-800 bg-zinc-900"
              >
                <SelectValue placeholder="Selecione a forma de pagamento">
                  {(value: unknown) =>
                    value
                      ? (PAYMENT_OPTIONS.find(
                          (o) => o.value === (value as string),
                        )?.label ?? "Selecione")
                      : "Selecione a forma de pagamento"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    data-testid={`payment-option-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment && (
              <p
                data-testid="delivery-form-error-payment"
                className="text-xs text-red-400"
              >
                {errors.payment}
              </p>
            )}
          </div>
        </div>

        <Button
          data-testid="delivery-form-submit-btn"
          onClick={handleSubmit}
          className="h-12 w-full bg-orange-600 font-heading text-base font-bold text-white hover:bg-orange-500"
        >
          Revisar pedido
        </Button>
      </DialogContent>
    </Dialog>
  );
}
