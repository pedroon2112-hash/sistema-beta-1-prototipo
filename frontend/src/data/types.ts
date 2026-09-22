// Modelos centrais — espelham os modelos Pydantic do backend (mantidos em sincronia
// manualmente: nada infere através da fronteira HTTP).
// Dinheiro SEMPRE em centavos inteiros (nunca float).

export interface Category {
  id: string;
  label: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  priceCents: number;
}

export interface OptionDef {
  id: string;
  label: string;
  priceCents: number;
}

export interface OptionGroupDef {
  id: string;
  label: string;
  hint?: string | null;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  /** true = escolha já paga no preço do produto (acompanhamento incluso, sabor). */
  noExtraCost: boolean;
  /** true = adicional extra com quantidade. */
  allowQuantity: boolean;
  options: OptionDef[];
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  image: string;
  basePriceCents?: number | null;
  available: boolean;
  position: number;
  variants: ProductVariant[];
  optionGroups: OptionGroupDef[];
}

export interface RestaurantInfo {
  name: string;
  tagline: string;
  logo: string;
  heroImage: string;
  instagram: string | null;
  whatsapp: string | null;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
}

export interface TableInfo {
  id: number;
  label: string;
}

/** GET /api/catalog — o cardápio inteiro vem do SQLite. */
export interface Catalog {
  categories: Category[];
  products: Product[];
  featuredProductIds: string[];
  restaurant: RestaurantInfo;
  tables: TableInfo[];
}

// ---- Carrinho (frontend) ----

export interface SelectedOption {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
  unitPriceCents: number;
  noExtraCost: boolean;
  quantity: number;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  image: string;
  variantId?: string;
  variantLabel?: string;
  baseUnitPriceCents: number;
  selectedOptions: SelectedOption[];
  note?: string;
  quantity: number;
}

export interface DeliveryInfo {
  name: string;
  phone: string;
  address: string;
  number: string;
  complement: string;
  reference: string;
}

export type PaymentMethod = "pix" | "dinheiro" | "cartao-credito" | "cartao-debito";

export const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao-credito", label: "Cartão — Crédito" },
  { value: "cartao-debito", label: "Cartão — Débito" },
];

// ---- Pedido (respostas do backend) ----

export interface OrderItemOption {
  groupLabel: string;
  optionLabel: string;
  unitPriceCents: number;
  quantity: number;
  noExtraCost: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantLabel: string | null;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  note: string | null;
  options: OrderItemOption[];
}

export interface Order {
  id: string;
  kind: "local" | "delivery";
  number: number;
  localDate: string;
  localTime: string;
  tableLabel: string | null;
  customerName: string | null;
  phone: string | null;
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  reference: string | null;
  paymentMethod: string;
  paymentLabel: string;
  totalCents: number;
  items: OrderItem[];
  comandaUrl: string;
  comandaFilename: string;
}

export interface OrderCreatePayload {
  mode: "local" | "delivery";
  tableLabel?: string | null;
  delivery?: {
    name: string;
    phone: string;
    address: string;
    number: string;
    complement?: string | null;
    reference?: string | null;
  } | null;
  paymentMethod: PaymentMethod;
  items: {
    productId: string;
    variantId?: string | null;
    options: { groupId: string; optionId: string; quantity: number }[];
    quantity: number;
    note?: string | null;
  }[];
  expectedTotalCents: number;
  idempotencyKey: string;
}
