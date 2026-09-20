import type {
  Category,
  OptionGroupDef,
  Product,
  RestaurantInfo,
} from "./types";

// ============================================================
// FONTE CENTRAL DE DADOS — todo o cardápio vive aqui.
// Nenhum produto, preço ou imagem deve ser espalhado pelos
// componentes. Imagens em /assets/products/<id-legivel>.jpg,
// substituíveis manualmente sem tocar em código.
// ============================================================

export const CATEGORIES: Category[] = [
  { id: "pratos", label: "Pratos Principais" },
  { id: "pizzas", label: "Pizzas" },
  { id: "porcoes-1", label: "Porções 1 pessoa" },
  { id: "porcoes-2", label: "Porções 2 pessoas" },
  { id: "cervejas", label: "Cervejas" },
  { id: "refri-lata", label: "Refrigerantes · Lata" },
  { id: "refri-600", label: "Refrigerantes · 600ml" },
  { id: "refri-15l", label: "Refrigerantes · 1,5L" },
  { id: "sucos", label: "Sucos e Cremes" },
  { id: "agua", label: "Água e Outros" },
];

export const restaurantInfo: RestaurantInfo = {
  name: "GalegonN Restaurante e Pizzaria",
  shortName: "GalegonN",
  tagline: "Restaurante e Pizzaria",
  logo: "/assets/brand/galegonn-logo.png",
  heroImage: "/assets/products/hero-pizzaria.jpg",
  // Dados oficiais ainda não fornecidos — permanecem null até chegarem
  // do restaurante (nada inventado). Prompt 2 poderá servi-los da API.
  instagram: null,
  whatsapp: null,
  phone: null,
  address: null,
  openingHours: null,
};

/** Referências por id — Mais Pedidos nunca duplica produtos. */
export const featuredProductIds = [
  "tilapia-crocante",
  "parmegiana-frango",
  "pizza-portuguesa",
  "pizza-galegonn",
];

// ---- Acompanhamentos / adicionais (tabela de extras, §17) ----

const ACCOMPANIMENT_OPTIONS = [
  { id: "pure-batata", label: "Purê de batata", price: 7.0 },
  { id: "arroz-com-alho", label: "Arroz com Alho", price: 7.0 },
  { id: "tropeiro", label: "Tropeiro", price: 7.0 },
  { id: "farofa-de-ovo", label: "Farofa de Ovo", price: 7.0 },
  { id: "fritas", label: "Fritas", price: 7.0 },
  { id: "couve-refogada", label: "Couve Refogada", price: 7.0 },
  { id: "salada-simples", label: "Salada Simples", price: 7.0 },
  { id: "macarrao-alho-oleo", label: "Macarrão Alho e Óleo", price: 7.0 },
  { id: "ovo-frito", label: "Ovo Frito", price: 3.5 },
  { id: "feijao-de-caldo", label: "Feijão de caldo", price: 7.0 },
  { id: "arroz-com-brocolis", label: "Arroz com brócolis", price: 7.0 },
  { id: "arroz", label: "Arroz", price: 7.0 },
];

/** Até 3 acompanhamentos inclusos no preço do prato (R$ 0,00). */
const includedAccompaniments = (): OptionGroupDef => ({
  id: "acompanhamentos",
  label: "Acompanhamentos inclusos",
  hint: "Escolha até 3 — já inclusos no preço",
  required: false,
  minSelect: 0,
  maxSelect: 3,
  noExtraCost: true,
  allowQuantity: false,
  options: ACCOMPANIMENT_OPTIONS.map((o) => ({ ...o, price: 0 })),
});

/** Adicionais EXTRAS pagos à parte, com quantidade. */
const extrasGroup = (): OptionGroupDef => ({
  id: "adicionais",
  label: "Adicionais extras",
  hint: "Quantidade extra — cobrados à parte",
  required: false,
  minSelect: 0,
  maxSelect: 12,
  noExtraCost: false,
  allowQuantity: true,
  options: ACCOMPANIMENT_OPTIONS,
});

const flavorGroup = (label: string, flavors: string[]): OptionGroupDef => ({
  id: "sabor",
  label,
  hint: "Escolha o sabor",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  noExtraCost: true,
  allowQuantity: false,
  options: flavors.map((f) => ({ id: slugify(f), label: f, price: 0 })),
});

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const img = (id: string) => `/assets/products/${id}.jpg`;

// ---- Fábricas de produto ----

/** Prato com montagem: até 3 acompanhamentos inclusos + extras pagos. */
function dish(
  id: string,
  name: string,
  price: number,
  description?: string,
): Product {
  return {
    id,
    name,
    description,
    categoryId: "pratos",
    image: img(id),
    basePrice: price,
    optionGroups: [includedAccompaniments(), extrasGroup()],
  };
}

/** Item "SO ..." — somente a proteína, sem acompanhamento incluso. */
function soItem(
  id: string,
  name: string,
  price: number,
  description?: string,
): Product {
  return {
    id,
    name,
    description,
    categoryId: "pratos",
    image: img(id),
    basePrice: price,
    optionGroups: [extrasGroup()],
  };
}

/** Sabor único com variantes Média / Grande. */
function pizza(
  id: string,
  name: string,
  description: string,
  media: number,
  grande: number,
): Product {
  return {
    id,
    name,
    description,
    categoryId: "pizzas",
    image: img(id),
    variants: [
      { id: "media", label: "Média", price: media },
      { id: "grande", label: "Grande", price: grande },
    ],
  };
}

function simple(
  id: string,
  name: string,
  price: number,
  categoryId: string,
  description?: string,
): Product {
  return { id, name, description, categoryId, image: img(id), basePrice: price };
}

// ---- Pratos principais (§16) ----

const PRATOS: Product[] = [
  dish("tilapia-crocante", "Tilápia Crocante", 28.9, "Isca de filé de tilápia"),
  soItem("so-tilapia", "SO TILAPIA", 23.9, "5 iscas de tilápia"),
  soItem("so-picanha", "SO PICANHA", 42.9, "CARNE"),
  soItem("so-parmegiana", "SO PARMEGIANA", 22.9, "SO O FRANGO"),
  soItem("so-frango", "SO FRANGO", 17.9, "CARNE"),
  soItem("so-costelinha-barbecue", "SO COSTELINHA BARBECUE", 27.9, "PORÇÃO"),
  soItem("so-carne-de-sol", "SO CARNE DE SOL", 34.9, "SO A CARNE"),
  soItem("so-bisteca", "SO BISTECA", 14.9, "CARNE"),
  soItem("so-bife", "SO BIFE", 24.9, "CARNE"),
  simple("pudim", "PUDIM", 6.5, "pratos", "PUDIM PEQUENO"),
  dish("picanha-na-chapa", "Picanha na Chapa", 47.9),
  dish("parmegiana-frango", "Parmegiana de Frango", 27.9),
  dish(
    "frango-grelhado",
    "Frango Grelhado",
    22.9,
    "Filé de peito de frango grelhado na chapa",
  ),
  dish(
    "costelinha-barbecue",
    "Costelinha ao molho barbecue",
    32.9,
    "Arroz, feijão, salada e fritas",
  ),
  dish("carne-de-sol", "CARNE DE SOL", 39.9, "CARNE DE SOL"),
  dish("bisteca", "Bisteca", 19.9),
  dish("bife-acebolado", "Bife Acebolado", 29.9),
];

// ---- Pizzas (§21) — cada sabor UMA única vez, Média/Grande como variantes ----

const PIZZAS: Product[] = [
  pizza(
    "pizza-calabresa",
    "Calabresa",
    "Molho de tomate, mussarela, calabresa, cebola, azeitona e orégano",
    34.99,
    38.99,
  ),
  pizza(
    "pizza-bacon",
    "Bacon",
    "Molho de tomate, mussarela, bacon, cebola roxa e orégano",
    37.99,
    39.99,
  ),
  pizza(
    "pizza-marguerita",
    "Marguerita",
    "Molho de tomate, mussarela, tomate cereja, manjericão e orégano",
    35.99,
    37.99,
  ),
  pizza(
    "pizza-frango-catupiry",
    "Frango com Catupiry",
    "Molho de tomate, mussarela, frango desfiado, catupiry e orégano",
    39.99,
    43.99,
  ),
  pizza(
    "pizza-portuguesa",
    "Portuguesa",
    "Molho de tomate, mussarela, presunto, calabresa, cebola, pimentão, azeitona, ovo e orégano",
    39.99,
    43.99,
  ),
  pizza(
    "pizza-presunto",
    "Presunto",
    "Molho de tomate, mussarela, presunto, azeitona e orégano",
    33.99,
    37.99,
  ),
  pizza(
    "pizza-napolitana",
    "Napolitana",
    "Molho de tomate, mussarela, tomate em rodelas, alho frito, manjericão e orégano",
    31.99,
    35.99,
  ),
  pizza(
    "pizza-mussarela",
    "Mussarela",
    "Molho de tomate, mussarela e orégano",
    32.99,
    37.99,
  ),
  pizza(
    "pizza-quatro-queijos",
    "Quatro Queijos",
    "Molho de tomate, mussarela, gorgonzola, catupiry, parmesão e orégano",
    43.99,
    46.99,
  ),
  pizza(
    "pizza-linguicinha",
    "Linguiçinha",
    "Molho de tomate, mussarela, linguiça apimentada, pimenta calabresa, manjericão e orégano",
    37.99,
    39.99,
  ),
  pizza(
    "pizza-milho",
    "Milho",
    "Molho de tomate, mussarela, milho verde e orégano",
    34.99,
    39.99,
  ),
  pizza(
    "pizza-alho-oleo",
    "Alho e Óleo",
    "Molho de tomate, mussarela, parmesão, alho frito e orégano",
    34.99,
    39.99,
  ),
  pizza(
    "pizza-carne-de-sol",
    "Carne de Sol",
    "Molho de tomate, mussarela, carne de sol, cebola, catupiry, parmesão e orégano",
    43.99,
    46.99,
  ),
  pizza(
    "pizza-peperoni",
    "Peperoni",
    "Molho de tomate, mussarela, peperoni, manjericão e orégano",
    50.99,
    54.99,
  ),
  pizza(
    "pizza-da-casa",
    "Da Casa",
    "Molho de tomate, mussarela, frango desfiado, bacon, catupiry, azeitona, milho e orégano",
    43.99,
    46.99,
  ),
  pizza(
    "pizza-lombo-canadense",
    "Lombo Canadense",
    "Molho de tomate, mussarela, lombo canadense, abacaxi, parmesão e orégano",
    38.99,
    42.99,
  ),
  pizza(
    "pizza-galegonn",
    "Galegonn",
    "Molho de tomate, mussarela, camarão, catupiry, parmesão, cebola roxa e orégano",
    50.99,
    54.99,
  ),
  pizza(
    "pizza-nordestina",
    "Nordestina",
    "Molho de tomate, mussarela, carne seca, gorgonzola, pimenta de cheiro, parmesão e orégano",
    43.99,
    46.99,
  ),
  pizza(
    "pizza-paulistana",
    "Paulistana",
    "Molho de tomate, mussarela, tomate em rodela, bacon, cebola, catupiry e orégano",
    40.99,
    44.99,
  ),
  pizza(
    "pizza-americana",
    "Americana",
    "Molho de tomate, mussarela, presunto, bacon, catupiry, parmesão e orégano",
    43.99,
    46.99,
  ),
  pizza(
    "pizza-a-cheirosa",
    "À Cheirosa",
    "Molho de tomate, mussarela, calabresa, cebola roxa, alho frito, pimenta de cheiro e orégano",
    38.99,
    42.99,
  ),
  pizza(
    "pizza-goiana",
    "Goiana",
    "Molho de tomate, mussarela, picanha, cebola, parmesão e orégano",
    50.99,
    54.99,
  ),
  pizza(
    "pizza-fortaleza",
    "Fortaleza",
    "Queijo coalho e rapadura",
    32.99,
    43.99,
  ),
  pizza(
    "pizza-banana-canela",
    "Banana com Canela",
    "Mussarela, banana, leite condensado e açúcar com canela",
    29.99,
    39.99,
  ),
  pizza(
    "pizza-chocolate",
    "Chocolate",
    "Mussarela, raspa de chocolate e calda de chocolate",
    37.99,
    42.99,
  ),
  pizza(
    "pizza-romeu-julieta",
    "Romeu e Julieta",
    "Mussarela e goiabada",
    34.99,
    39.99,
  ),
  pizza(
    "pizza-banana-chocolate",
    "Banana com Chocolate",
    "Mussarela, banana e chocolate",
    44.99,
    47.99,
  ),
  pizza(
    "pizza-kids",
    "Kids",
    "Mussarela, calda de chocolate, marshmallow, m&m, sonho de valsa e jujuba",
    46.99,
    50.99,
  ),
  pizza(
    "pizza-sonho-de-valsa",
    "Sonho de Valsa",
    "Mussarela, calda de chocolate e sonho de valsa",
    44.99,
    48.99,
  ),
  pizza(
    "pizza-charmosa",
    "Charmosa",
    "MUSSARELA, BANANA E RAPADURA",
    43.99,
    46.99,
  ),
  pizza(
    "pizza-coco",
    "Coco",
    "MUSSARELA, COCO RALADO E LEITE CONDENSADO",
    44.99,
    47.99,
  ),
  pizza(
    "pizza-mexicana",
    "Mexicana",
    "MOLHO DE TOMATE, MUSSARELA, CALABRESA, PIMENTA CALABRESA, TOMATE EM RODELAS, MANJERICÃO E ORÉGANO",
    36.99,
    38.99,
  ),
  pizza(
    "pizza-belesura",
    "Belesura",
    "MOLHO DE TOMATE, CALABRESA, LOMBO, TOMATE EM RODELAS, PARMESÃO E ORÉGANO",
    43.99,
    46.99,
  ),
  pizza(
    "pizza-mineirinha",
    "Mineirinha",
    "MOLHO DE TOMATE, MUSSARELA, MILHO, BACON, BRÓCOLIS, CREME DE LEITE E ORÉGANO",
    43.99,
    46.99,
  ),
  pizza(
    "pizza-carbonara",
    "Carbonara",
    "MOLHO DE TOMATE, MUSSARELA, BACON, CEBOLA, CREME DE LEITE E ORÉGANO",
    43.99,
    46.99,
  ),
];

// ---- Porções (§18 / §19) ----

const PORCOES_1: Product[] = [
  simple(
    "porcao-picanha-fritas-1p",
    "Porção de Picanha com Fritas",
    59.9,
    "porcoes-1",
    "Fritas, queijo e cebola",
  ),
  simple(
    "porcao-tilapia-crocante-1p",
    "Porção de Tilápia Crocante",
    49.9,
    "porcoes-1",
    "Cebola roxa e molho galegonn",
  ),
];

const PORCOES_2: Product[] = [
  simple(
    "porcao-picanha-fritas-2p",
    "Porção de Picanha com Fritas",
    73.9,
    "porcoes-2",
    "Fritas, queijo e cebola",
  ),
  simple(
    "porcao-tilapia-crocante-2p",
    "Porção de Tilápia Crocante",
    69.9,
    "porcoes-2",
    "Cebola roxa e molho galegonn",
  ),
  simple("porcao-fritas-2p", "Porção de Fritas", 24.9, "porcoes-2"),
  simple(
    "porcao-fritas-queijo-bacon",
    "Porção de Fritas com Queijo e Bacon",
    28.9,
    "porcoes-2",
  ),
  simple(
    "porcao-espaguete-alho-oleo",
    "Porção de Espaguete Alho e Óleo",
    20.9,
    "porcoes-2",
  ),
];

// ---- Bebidas ----

const CERVEJAS: Product[] = [
  simple("cerveja-antartica-600ml", "Antártica 600ml", 13.9, "cervejas"),
  simple("cerveja-brahma-chopp-600ml", "Brahma Chopp 600ml", 13.9, "cervejas"),
  simple("cerveja-heineken-long-neck", "Heineken Long Neck", 10.9, "cervejas"),
  simple("cerveja-original-600ml", "Original 600ml", 14.9, "cervejas"),
];

const refri = (id: string, name: string, price: number, categoryId: string) =>
  simple(id, name, price, categoryId);

const REFRI_LATA: Product[] = [
  refri("refri-coca-cola-lata", "Coca Cola", 6.0, "refri-lata"),
  refri("refri-coca-cola-zero-lata", "Coca Cola Zero", 6.0, "refri-lata"),
  refri("refri-fanta-guarana-mineiro-lata", "Fanta Guaraná/mineiro", 6.0, "refri-lata"),
  refri("refri-fanta-laranja-lata", "Fanta Laranja", 6.0, "refri-lata"),
  refri("refri-fanta-uva-lata", "Fanta Uva", 6.0, "refri-lata"),
  refri("refri-sprite-lata", "Sprite", 6.0, "refri-lata"),
];

const REFRI_600: Product[] = [
  refri("refri-coca-cola-600ml", "Coca Cola", 9.9, "refri-600"),
  refri("refri-guarana-600ml", "Guarana", 8.9, "refri-600"),
  refri("refri-fanta-uva-600ml", "Fanta Uva", 8.9, "refri-600"),
  refri("refri-fanta-laranja-600ml", "Fanta Laranja", 8.9, "refri-600"),
  refri("refri-sprite-600ml", "Sprite", 8.9, "refri-600"),
  refri("refri-coca-zero-600ml", "Coca Zero", 9.9, "refri-600"),
];

const REFRI_15L: Product[] = [
  refri("refri-sprite-15l", "Sprite", 9.9, "refri-15l"),
  refri("refri-kuat-15l", "Kuat", 9.9, "refri-15l"),
  refri("refri-fanta-laranja-15l", "Fanta Laranja", 9.9, "refri-15l"),
  refri("refri-coca-cola-15l", "Coca Cola", 13.9, "refri-15l"),
  refri("refri-coca-cola-zero-15l", "Coca Cola Zero", 13.9, "refri-15l"),
  refri("refri-mineiro-15l", "Mineiro", 9.9, "refri-15l"),
  refri("refri-guarana-antarctica-15l", "Guarana Antarctica", 9.9, "refri-15l"),
  refri("refri-fanta-uva-15l", "Fanta Uva", 9.9, "refri-15l"),
];

const SUCOS: Product[] = [
  {
    ...simple("suco-polpa-300ml", "Suco de Polpa 300ml", 8.0, "sucos"),
    optionGroups: [
      flavorGroup("Sabores", [
        "Abacaxi com Hortelã",
        "Goiaba",
        "Manga",
        "Morango",
        "Cupuaçu",
        "Acerola",
        "Cajá",
      ]),
    ],
  },
  {
    ...simple("creme-polpa-300ml", "Creme de Polpa 300ml", 10.0, "sucos"),
    optionGroups: [
      flavorGroup("Sabores", [
        "Cupuaçu",
        "Goiaba",
        "Abacaxi com Hortelã",
        "Morango",
        "Acerola",
        "Manga",
        "Cajá",
      ]),
    ],
  },
  {
    ...simple("suco-natural-300ml", "Suco Natural 300ml", 10.0, "sucos"),
    optionGroups: [flavorGroup("Sabores", ["Laranja", "Limão"])],
  },
];

const AGUA: Product[] = [
  simple("agua-sem-gas", "Água Sem Gás", 3.0, "agua"),
  simple("agua-com-gas", "Água Com Gás", 4.0, "agua"),
  simple("h2o", "H2O", 9.9, "agua"),
];

// ---- Catálogo final ----

export const PRODUCTS: Product[] = [
  ...PRATOS,
  ...PIZZAS,
  ...PORCOES_1,
  ...PORCOES_2,
  ...CERVEJAS,
  ...REFRI_LATA,
  ...REFRI_600,
  ...REFRI_15L,
  ...SUCOS,
  ...AGUA,
];

const PRODUCT_INDEX = new Map(PRODUCTS.map((p) => [p.id, p]));

export function getProduct(id: string): Product | undefined {
  return PRODUCT_INDEX.get(id);
}

export function productsByCategory(categoryId: string): Product[] {
  return PRODUCTS.filter((p) => p.categoryId === categoryId);
}

export function featuredProducts(): Product[] {
  return featuredProductIds
    .map((id) => getProduct(id))
    .filter((p): p is Product => Boolean(p));
}

/** Menor preço exibível do produto (considera variantes). */
export function minPrice(product: Product): number {
  if (product.variants?.length) {
    return Math.min(...product.variants.map((v) => v.price));
  }
  return product.basePrice ?? 0;
}

/** Seleciona a variante default (primeira) — usado na configuração. */
export function defaultVariant(product: Product) {
  return product.variants?.[0];
}

/** Grupos cujas escolhas são obrigatórias (ex.: sabor do suco). */
export function requiredGroups(product: Product): OptionGroupDef[] {
  return (product.optionGroups ?? []).filter((g) => g.required);
}
