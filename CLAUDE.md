# CLAUDE.md

Contexto para um agente de IA (ou uma pessoa) continuar este projeto sem
precisar perguntar tudo de novo. Leia isto antes de mexer em `lib/pricing.ts`
ou nas rotas de API.

## O que este projeto é

Um simulador de viabilidade de venda. Um vendedor informa o valor de um
contrato e a forma de pagamento; a ferramenta mostra a margem líquida da
unidade e a comissão do vendedor, em tempo real, durante uma negociação. O
gestor da equipe ajusta os parâmetros financeiros (percentuais de custo) em
um painel separado, que o time comercial não acessa.

Stack: Next.js 14 (App Router), TypeScript, Tailwind. Sem banco de dados
externo — ver "Limitações conhecidas" abaixo, é a fragilidade mais
importante do projeto.

## A regra de negócio (não mexer sem ler isto)

Toda a regra vive em `lib/pricing.ts`, na função `simular()`. É código puro,
sem dependência de Next.js — pode (e deve) ser testado isoladamente.

A cascata de deduções, nesta ordem exata, cada uma incidindo sobre uma base
diferente:

1. **Royalties** — 18% sobre o valor bruto do contrato.
2. **Impostos** — 11% sobre o valor **já deduzido dos royalties** (não sobre
   o bruto). Ou seja: `impostos = (valorBruto - royalties) * 0.11`.
3. **Taxa da forma de pagamento** — sempre incide sobre o **valor bruto**,
   nunca sobre o valor já reduzido pelas etapas anteriores:
   - PIX: 1,5% do bruto.
   - Cartão parcelado: 14% do bruto (o número de parcelas não afeta o
     valor da taxa, só é armazenado/exibido).
   - Boleto: R$ 4,90 fixos **por parcela emitida** (`4.90 * parcelas`).
4. **CSP** (custo de entrega do serviço) — R$ 3.500,00 fixos por contrato,
   independente do valor do contrato.
5. **Margem líquida** = valor bruto − (1) − (2) − (3) − (4).
6. **Comissão do vendedor** = 12% da margem líquida, **somente se** a
   margem líquida for ≥ 15% do valor bruto do contrato. Abaixo disso, a
   comissão é zero — não é reduzida, é zerada.
7. **Resultado final da unidade** = margem líquida − comissão.

Todos os percentuais e valores fixos acima são os *valores padrão*
(`PARAMETROS_PADRAO` em `lib/pricing.ts`), mas são configuráveis em tempo de
execução via o painel do gestor — ver `lib/config-store.ts`. Nunca hardcode
esses números em outro lugar do código; sempre passe um `ParametrosFinanceiros`
para `simular()`.

### Inconsistência conhecida no caso de validação nº 1 do desafio

O desafio original trouxe 4 casos de validação. Implementando a regra escrita
ao pé da letra:

- Casos 2, 3 e 4 batem **exatamente** com a tabela do desafio.
- Caso 1 (R$ 10.000, PIX, 1x) diverge: a regra escrita produz margem líquida
  de **R$ 3.648,00**, mas a tabela do desafio traz **R$ 3.450,00** (diferença
  de R$ 198,00). Comissão e resultado final da tabela são internamente
  consistentes com o R$ 3.450,00 dela (12% de 3.450 = 414; 3.450 − 414 =
  3.036), então o erro está isolado na etapa de deduções desse caso
  específico, não na fórmula de comissão.

Esta implementação segue a **regra escrita**, não o número da tabela — os
outros três casos confirmam que a regra escrita é a fonte da verdade. Isso
está documentado com detalhe em `RELATORIO.md` e em um comentário no teste
correspondente (`tests/pricing.test.ts`). Se o cliente confirmar que o caso 1
da tabela está certo e a regra escrita é que está errada, o ajuste é em
`lib/pricing.ts`, função `simular()`, etapa 2 (impostos) — não mexer em mais
nada além disso até entender de onde vem a diferença de R$ 198,00.

## Como os parâmetros sensíveis ficam escondidos do time comercial

O requisito do desafio diz que vendedores usam a ferramenta mas não podem
ver os percentuais de custo. A decisão tomada foi: **o cálculo inteiro
acontece no servidor** (`app/api/simulate/route.ts`), e a resposta para o
cliente contém só valores já calculados em reais (royalties em R$, impostos
em R$, etc.) — nunca os percentuais ou o valor de CSP como parâmetro puro.
A tela do vendedor (`app/page.tsx`) não tem, em nenhum momento, acesso aos
percentuais.

Se alguém for "otimizar" e mover o cálculo para o cliente para reduzir uma
chamada de rede, isso reabre o vazamento que o requisito pede para evitar.
Não faça isso.

**Ressalva importante, não pule esta parte:** isso impede vazamento passivo
— ninguém encontra "18%" hardcoded inspecionando o bundle JS, o código-fonte
da página ou o payload de rede. Mas como o requisito também pede que cada
dedução apareça em R$, de forma destrinchada, qualquer vendedor que rodar
uma simulação com um valor bruto que ele mesmo escolheu pode simplesmente
dividir `royalties / valorBruto` e descobrir o percentual exato de
royalties — e o mesmo vale para impostos e taxa da forma de pagamento. Isso
não é uma falha de implementação; é uma tensão matemática inerente ao
requisito ("esconda o percentual" + "mostre o valor de cada dedução em R$
para um valor de entrada que o próprio usuário controla"). Ver
`RELATORIO.md`, seção "Onde a aplicação está frágil", antes de tentar
"consertar" isso — a solução provavelmente é uma pergunta para o cliente,
não uma mudança de código.

## Autenticação do painel do gestor

`lib/admin-auth.ts` implementa uma sessão simples: uma senha única
(`ADMIN_PASSWORD`, variável de ambiente) libera um cookie httpOnly assinado
com HMAC (`ADMIN_SESSION_SECRET`). Não há usuários individuais, papéis ou
recuperação de senha. Isso é suficiente para o escopo do desafio, mas é uma
lacuna real — ver `RELATORIO.md`.

## Limitações conhecidas (leia antes de "corrigir" algo que já é sabido)

- **Configuração em memória**: `lib/config-store.ts` guarda os parâmetros
  financeiros numa variável do processo Node, não em um banco de dados. Em
  produção na Vercel (funções serverless), isso significa que cada cold
  start volta para `PARAMETROS_PADRAO`, e instâncias em paralelo podem
  divergir entre si. Antes de ir para produção de verdade, isso precisa
  virar uma tabela em um banco (Postgres, Vercel KV, etc.) com uma única
  fonte de verdade. Não é um bug do código atual — é uma limitação conhecida
  e documentada, para manter o escopo do desafio enxuto.
- **Sem persistência de simulações**: cada simulação é stateless; nada é
  salvo. Se o cliente quiser histórico de simulações por vendedor, isso é
  uma feature nova, não um bug.
- **Sem testes de UI**: só a lógica de negócio (`lib/pricing.ts`) tem testes
  automatizados. O formulário e o painel do gestor foram testados
  manualmente (ver `RELATORIO.md`, "O que foi testado").
- **Uma senha única para o painel do gestor**: não há múltiplos usuários,
  nem log de quem alterou o quê.

## Comandos úteis

```bash
npm install       # instalar dependências
npm run dev        # ambiente de desenvolvimento
npm test           # testes de lib/pricing.ts contra os casos de validação
npm run build       # build de produção (falha se houver erro de tipo)
```

## Convenções do projeto

- Nomes de variáveis, tipos e mensagens de erro em **português**, incluindo
  no código (`ParametrosFinanceiros`, `valorBruto`, `simular()`) — é assim
  que o negócio se refere a essas coisas, e é o idioma de quem vai continuar
  este projeto.
- `lib/pricing.ts` é a única fonte da verdade da regra de negócio. Se uma
  mudança de regra não cabe alterando esse arquivo, provavelmente está sendo
  feita no lugar errado.
- Os parâmetros financeiros nunca trafegam para `app/page.tsx` nem para
  qualquer resposta de API que o vendedor acesse — só para as rotas
  `/api/admin/*`, protegidas por sessão.
