import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  CartItem,
  OptionGroupDef,
  Product,
  SelectedOption,
} from "@/data/types";
import { formatCents } from "@/lib/format";
import { useIsMobile } from "@/lib/useIsMobile";

interface ProductConfigSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<CartItem, "cartItemId">) => void;
}

type SelectionMap = Record<string, Record<string, number>>;

function initSelections(groups: OptionGroupDef[]): SelectionMap {
  const map: SelectionMap = {};
  for (const g of groups) {
    map[g.id] = Object.fromEntries(g.options.map((o) => [o.id, 0]));
  }
  return map;
}

// Configuração genérica de produto: variantes (pizza Média/Grande), grupos de
// escolha única (sabor), multi-escolha inclusa (até 3 acompanhamentos) e
// adicionais extras pagos com quantidade. Um único mecanismo para tudo.
export default function ProductConfigSheet({
  product,
  open,
  onOpenChange,
  onAdd,
}: ProductConfigSheetProps) {
  const isMobile = useIsMobile();
  // Mantém o último produto durante a animação de saída do sheet.
  const [held, setHeld] = useState<Product | null>(null);
  useEffect(() => {
    if (product) setHeld(product);
  }, [product]);
  const current = product ?? held;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {current && (
        <SheetContent
          data-testid="product-config-sheet"
          side={isMobile ? "bottom" : "right"}
          // Altura via style: o SheetContent aplica data-[side=bottom]:h-auto,
          // que vence classes utilitárias de altura na ordem do CSS.
          style={isMobile ? { height: "92svh" } : undefined}
          className={
            isMobile
              ? "flex flex-col gap-0 rounded-t-2xl p-0"
              : "flex w-full flex-col gap-0 p-0 sm:max-w-md"
          }
        >
          <ConfigForm
            key={current.id}
            product={current}
            onAdd={(item) => {
              onAdd(item);
              toast.success(`${item.productName} adicionado ao carrinho`);
              onOpenChange(false);
            }}
          />
        </SheetContent>
      )}
    </Sheet>
  );
}

interface ConfigFormProps {
  product: Product;
  onAdd: (item: Omit<CartItem, "cartItemId">) => void;
}

function ConfigForm({ product, onAdd }: ConfigFormProps) {
  const [variantId, setVariantId] = useState<string | undefined>(
    product.variants[0]?.id,
  );
  const [selections, setSelections] = useState<SelectionMap>(() =>
    initSelections(product.optionGroups),
  );
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  const variant = product.variants.find((v) => v.id === variantId);
  const base = variant ? variant.priceCents : (product.basePriceCents ?? 0);

  const selectedCount = (g: OptionGroupDef) =>
    Object.values(selections[g.id] ?? {}).filter((v) => v > 0).length;

  const missingRequired = product.optionGroups.filter(
    (g) => g.required && selectedCount(g) < g.minSelect,
  );

  const extrasTotal = product.optionGroups.reduce(
    (sum, g) =>
      g.noExtraCost
        ? sum
        : sum +
          g.options.reduce(
            (s, o) => s + (selections[g.id]?.[o.id] ?? 0) * o.priceCents,
            0,
          ),
    0,
  );
  const unitPrice = base + extrasTotal;
  const lineTotal = unitPrice * qty;

  function toggleOption(g: OptionGroupDef, optionId: string) {
    setSelections((prev) => {
      const group = { ...(prev[g.id] ?? {}) };
      if ((group[optionId] ?? 0) > 0) {
        group[optionId] = 0;
      } else if (g.maxSelect === 1) {
        for (const key of Object.keys(group)) group[key] = 0;
        group[optionId] = 1;
      } else {
        const count = Object.values(group).filter((v) => v > 0).length;
        if (count >= g.maxSelect) return prev; // limite atingido
        group[optionId] = 1;
      }
      return { ...prev, [g.id]: group };
    });
  }

  function changeExtraQty(g: OptionGroupDef, optionId: string, delta: number) {
    setSelections((prev) => {
      const group = { ...(prev[g.id] ?? {}) };
      group[optionId] = Math.max(0, Math.min(5, (group[optionId] ?? 0) + delta));
      return { ...prev, [g.id]: group };
    });
  }

  function handleAdd() {
    const selectedOptions: SelectedOption[] = [];
    for (const g of product.optionGroups ?? []) {
      for (const o of g.options) {
        const value = selections[g.id]?.[o.id] ?? 0;
        if (value > 0) {
          selectedOptions.push({
            groupId: g.id,
            groupLabel: g.label,
            optionId: o.id,
            optionLabel: o.label,
            unitPriceCents: g.noExtraCost ? 0 : o.priceCents,
            noExtraCost: g.noExtraCost,
            quantity: g.allowQuantity ? value : 1,
          });
        }
      }
    }
    onAdd({
      productId: product.id,
      productName: product.name,
      image: product.image,
      variantId: variant?.id,
      variantLabel: variant?.label,
      baseUnitPriceCents: base,
      selectedOptions,
      note: note.trim() ? note.trim() : undefined,
      quantity: qty,
    });
  }

  return (
    <>
      <div className="shrink-0">
        <img
          src={product.image}
          alt={product.name}
          className="h-36 w-full rounded-t-2xl object-cover"
        />
        <SheetHeader className="px-4 pt-3 pb-1">
          <SheetTitle className="font-heading text-xl font-bold text-zinc-50">
            {product.name}
          </SheetTitle>
          {product.description && (
            <SheetDescription className="text-sm leading-snug text-zinc-400">
              {product.description}
            </SheetDescription>
          )}
        </SheetHeader>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-2 pb-4">
        {product.variants.length > 0 ? (
          <section>
            <p className="text-sm font-semibold text-zinc-200">Tamanho</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {product.variants.map((v) => {
                const selected = v.id === variantId;
                const testId =
                  product.categoryId === "pizzas"
                    ? `pizza-size-toggle-${v.id}`
                    : `variant-option-${v.id}`;
                return (
                  <button
                    key={v.id}
                    type="button"
                    data-testid={testId}
                    aria-pressed={selected}
                    onClick={() => setVariantId(v.id)}
                    className={`flex min-h-12 flex-col items-center justify-center rounded-lg border px-3 py-2 transition-colors duration-200 ${
                      selected
                        ? "border-orange-600 bg-orange-950/40 text-orange-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    <span className="text-sm font-medium">{v.label}</span>
                    <span className="font-heading text-sm font-bold">
                      {formatCents(v.priceCents)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {product.optionGroups.map((g) => {
          const count = selectedCount(g);
          const atLimit = count >= g.maxSelect;
          return (
            <section key={g.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-200">{g.label}</p>
                {!g.allowQuantity && g.maxSelect > 1 && (
                  <span
                    data-testid="accompaniment-counter"
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      count >= g.maxSelect
                        ? "border-orange-600 bg-orange-950/40 text-orange-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {count} de {g.maxSelect} selecionados
                  </span>
                )}
              </div>
              {g.hint && (
                <p className="mt-0.5 text-xs text-zinc-500">{g.hint}</p>
              )}

              <div className="mt-2 grid gap-2">
                {g.options.map((o) => {
                  const selected = (selections[g.id]?.[o.id] ?? 0) > 0;
                  const blocked = !selected && !g.allowQuantity && atLimit;

                  // Adicional extra: linha com stepper de quantidade.
                  if (g.allowQuantity) {
                    const extraQty = selections[g.id]?.[o.id] ?? 0;
                    return (
                      <div
                        key={o.id}
                        data-testid={`extra-addon-option-${o.id}`}
                        className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors duration-200 ${
                          extraQty > 0
                            ? "border-orange-600 bg-orange-950/20"
                            : "border-zinc-800 bg-zinc-900"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-100">
                            {o.label}
                          </p>
                          <p className="text-xs text-orange-400">
                            + {formatCents(o.priceCents)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            data-testid={`extra-qty-minus-${o.id}`}
                            aria-label={`Remover um ${o.label} extra`}
                            disabled={extraQty === 0}
                            onClick={() => changeExtraQty(g, o.id, -1)}
                            className="flex size-9 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 disabled:opacity-40"
                          >
                            <Minus className="size-4" aria-hidden />
                          </button>
                          <span
                            data-testid={`extra-qty-value-${o.id}`}
                            className="w-6 text-center text-sm font-bold text-zinc-100"
                          >
                            {extraQty}
                          </span>
                          <button
                            type="button"
                            data-testid={`extra-qty-plus-${o.id}`}
                            aria-label={`Adicionar um ${o.label} extra`}
                            onClick={() => changeExtraQty(g, o.id, 1)}
                            className="flex size-9 items-center justify-center rounded-md bg-orange-600 text-white"
                          >
                            <Plus className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Escolha única obrigatória (ex.: sabor do suco).
                  if (g.maxSelect === 1 && g.required) {
                    return (
                      <button
                        key={o.id}
                        type="button"
                        data-testid={`option-${o.id}`}
                        aria-pressed={selected}
                        onClick={() => toggleOption(g, o.id)}
                        className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors duration-200 ${
                          selected
                            ? "border-orange-600 bg-orange-950/40"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                        }`}
                      >
                        <span className="text-sm font-medium text-zinc-100">
                          {o.label}
                        </span>
                        <span
                          className={`size-4 rounded-full border-2 ${
                            selected
                              ? "border-orange-500 bg-orange-500"
                              : "border-zinc-600"
                          }`}
                          aria-hidden
                        />
                      </button>
                    );
                  }

                  // Acompanhamento incluso (multi, até maxSelect).
                  return (
                    <button
                      key={o.id}
                      type="button"
                      data-testid={`accompaniment-option-${o.id}`}
                      aria-pressed={selected}
                      aria-disabled={blocked}
                      onClick={() => {
                        if (!blocked) toggleOption(g, o.id);
                      }}
                      className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors duration-200 ${
                        selected
                          ? "border-orange-600 bg-orange-950/40"
                          : blocked
                            ? "border-zinc-800 bg-zinc-900 opacity-40"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-100">
                        {o.label}
                      </span>
                      <span
                        className={`flex size-5 items-center justify-center rounded border-2 text-[11px] font-black ${
                          selected
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-zinc-600 text-transparent"
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section>
          <label
            htmlFor="product-note"
            className="text-sm font-semibold text-zinc-200"
          >
            Observação do item
          </label>
          <p className="mt-0.5 text-xs text-zinc-500">
            Ex.: sem cebola, ponto da carne
          </p>
          <Textarea
            id="product-note"
            data-testid="product-note-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Escreva aqui, se precisar"
            className="mt-2 min-h-20 border-zinc-800 bg-zinc-900 text-sm placeholder:text-zinc-600"
          />
        </section>
      </div>

      <SheetFooter className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-4">
        <div className="flex w-full items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="product-qty-minus"
              aria-label="Diminuir quantidade"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex size-11 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span
              data-testid="product-qty-value"
              className="w-7 text-center font-heading text-lg font-bold text-zinc-50"
            >
              {qty}
            </span>
            <button
              type="button"
              data-testid="product-qty-plus"
              aria-label="Aumentar quantidade"
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              className="flex size-11 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <div className="flex-1">
            <Button
              data-testid="add-to-cart-submit-btn"
              disabled={missingRequired.length > 0}
              onClick={handleAdd}
              className="h-12 w-full bg-orange-600 font-heading text-base font-bold text-white hover:bg-orange-500"
            >
              {missingRequired.length > 0
                ? `Escolha: ${missingRequired[0].hint ?? missingRequired[0].label}`
                : `Adicionar • ${formatCents(lineTotal)}`}
            </Button>
          </div>
        </div>
      </SheetFooter>
    </>
  );
}
