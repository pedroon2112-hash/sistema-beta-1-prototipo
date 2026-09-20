// Modelos centrais do cardápio — a única fonte de tipos compartilhados entre
// dados, componentes e carrinho. Estruturados para serem serializados e
// enviados ao backend no Prompt 2 (snapshot de pedido / histórico).

export interface Category {
  id: string;
  label: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  price: number;
}

export interface OptionDef {
  id: string;
  label: string;
  /** Preço do EXTRA; opções de custo embutido ficam com 0. */
  price: number;
}

export interface OptionGroupDef {
  id: string;
  label: string;
  hint?: string;
  /** Exige ao menos minSelect escolhas antes de adicionar ao carrinho. */
  required: boolean;
  minSelect: number;
  maxSelect: number;
  /** true = escolha já paga no preço do produto (não soma). */
  noExtraCost: boolean;
  /** Permite quantidade por opção (adicionais extras). */
  allowQuantity: boolean;
  options: OptionDef[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  /** Caminho humano e substituível em /assets/products/. */
  image: string;
  /** Produtos simples (sem variantes). */
  basePrice?: number;
  /** Pizzas: Média / Grande no mesmo produto. */
  variants?: ProductVariant[];
  optionGroups?: OptionGroupDef[];
}

// ---- Carrinho (item já é um snapshot: pronto para histórico/comanda) ----

export interface SelectedOption {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
  /** Preço unitário do extra no momento do pedido (0 quando embutido). */
  unitPrice: number;
  /** true = embutido no preço (ex.: acompanhamento incluso, sabor). */
  noExtraCost: boolean;
  quantity: number;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  // Snapshot do momento da compra — pedidos antigos não mudam de preço.
  productName: string;
  image: string;
  variantId?: string;
  variantLabel?: string;
  baseUnitPrice: number;
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
  paymentMethod: string;
}

// ---- Informações do restaurante ----
// Dados reais ainda não fornecidos: ficam null e a UI exibe placeholder
// claramente identificável — nada é inventado.

export interface RestaurantInfo {
  name: string;
  shortName: string;
  tagline: string;
  logo: string;
  heroImage: string;
  instagram: string | null;
  whatsapp: string | null;
  phone: string | null;
  address: string | null;
  openingHours: string | null;
}
