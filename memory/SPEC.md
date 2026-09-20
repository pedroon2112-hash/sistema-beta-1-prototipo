# GalegonN Restaurante e Pizzaria — SPEC (Prompt 1)

Site público de pedidos: entrada NO LOCAL / DELIVERY, seleção de mesa, cardápio
único compartilhado, carrinho persistente e formulário de delivery.
**Prompt 1 é frontend-only por design** (decisão do usuário): NÃO existe envio
de pedido, backend de pedidos, admin, login nem impressão — tudo isso é o
Prompt 2. O backend FastAPI mantém apenas o probe `/api/status` do template
(nenhuma funcionalidade falsa foi criada, conforme §29 do briefing).

## Rotas
- `/` — tela inicial: identidade + dois cartões grandes [NO LOCAL] / [DELIVERY]
- `/local` — seleção de mesa (Mesa 1..12, sem estados livres/ocupadas); aceita
  `?mesa=N` (QR Code): mesa pré-selecionada + CTA direto pro cardápio
- `/delivery` — ativa modo delivery e redireciona ao cardápio
- `/cardapio` — cardápio único (exige modo; sem modo → volta para `/`)
- `*` — redireciona para `/`

## Fonte única de dados
`frontend/src/data/menu.ts` — TODO o catálogo (89 produtos), categorias,
`featuredProductIds` (Mais Pedidos referencia por id) e `restaurantInfo`
(dados oficiais não fornecidos = `null`; UI mostra "A informar", nada
inventado). Imagens em `/assets/products/<id-produto>.jpg` — substituição
manual por foto real em um único caminho. Logo oficial em
`/assets/brand/galegonn-logo.png` (enviada pelo usuário, 200×200).

## Modelo
- `Product { id, name, description?, categoryId, image, basePrice?, variants?, optionGroups? }`
- `ProductVariant { id, label, price }` — pizzas: cada sabor UMA vez com
  variantes `media`/`grande`
- `OptionGroupDef { id, label, required, minSelect, maxSelect, noExtraCost, allowQuantity, options }`
  - grupo `acompanhamentos`: até 3 inclusos (R$ 0,00) — pratos normais
  - itens "SO ..." (só a proteína): apenas grupo `adicionais` (extras pagos)
  - grupo `sabor` (required, single): sucos/cremes de polpa
  - grupo `adicionais` (extras, qty por item): tabela §17 (7,00 / ovo 3,50)
- `CartItem` = snapshot (productId, productName, image, variant, baseUnitPrice,
  selectedOptions[], note, quantity) — pronto p/ histórico/comanda no Prompt 2
- Carrinho: `localStorage["galegonn.cart.v1"]`; mescla por identidade
  (produto+variante+opções+obs); modos compartilham o MESMO carrinho
- Modo/mesa: `sessionStorage["galegonn.order.v1"]`

## Categorias
pratos, pizzas (35 sabores), porcoes-1, porcoes-2, cervejas, refri-lata,
refri-600, refri-15l, sucos (3 configuráveis), agua.

## Finalização (honestidade — §29)
- Delivery: carrinho → formulário (Nome, Telefone, Endereço, Número,
  Complemento, Ponto de referência, Forma de pagamento) → tela de REVISÃO com
  aviso claro "Pedido não enviado — envio online em breve" (sem confirmação
  falsa, sem alert falso).
- No local: carrinho mostra aviso "envio digital em breve", sem botão de envio.

## Auth
Nenhuma (sem login/cadastro por especificação). `memory/test_credentials.md`
não possui credenciais.

## Notas para o Prompt 2
Tipos já serializáveis: `CartItem`/`SelectedOption`/`DeliveryInfo` em
`frontend/src/data/types.ts` formam o payload do pedido; preço unitário +
snapshot garantem histórico imutável. Troca de mesa e modo não limpa o carrinho.
