# Simulador de Viabilidade de Venda

Ferramenta interna para o time comercial simular, durante uma negociação, se
um desconto ainda deixa a venda viável — e para o gestor ajustar os
parâmetros financeiros sem que o time comercial os veja.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS, sem banco de dados
externo (ver `RELATORIO.md`, seção "Onde a aplicação está frágil", para o
que isso significa em produção).

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # e edite ADMIN_PASSWORD / ADMIN_SESSION_SECRET
npm run dev
```

Abra `http://localhost:3000` para o simulador e `http://localhost:3000/admin`
para o painel do gestor (login com a senha definida em `ADMIN_PASSWORD`).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ADMIN_PASSWORD` | Sim, para o `/admin` funcionar | Senha única do painel do gestor. |
| `ADMIN_SESSION_SECRET` | Recomendada em produção | Segredo para assinar o cookie de sessão do admin. Sem ela, usa um valor padrão de desenvolvimento — **não faça deploy em produção sem definir esta variável**. |

## Testes

```bash
npm test
```

Os testes validam a lógica de cascata de deduções (`lib/pricing.ts`) contra
os casos de validação do desafio. Ver `RELATORIO.md` para uma discrepância
encontrada entre o caso de validação nº 1 do desafio e a regra de negócio
escrita.

## Build de produção

```bash
npm run build
npm start
```

## Deploy

Pensado para Vercel (`vercel deploy`). Antes de colocar em produção, defina
`ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET` nas variáveis de ambiente do
projeto na Vercel, e leia a seção "Onde a aplicação está frágil" do
`RELATORIO.md` — a configuração dos parâmetros financeiros hoje é guardada em
memória, não em um banco de dados persistente.

## Estrutura

```
app/
  page.tsx                 # tela do vendedor (calculadora)
  admin/page.tsx            # tela do gestor (login + parâmetros)
  api/simulate/route.ts     # calcula e retorna só valores em R$
  api/admin/login/route.ts  # login do painel do gestor
  api/admin/config/route.ts # leitura/atualização dos parâmetros (protegida)
lib/
  pricing.ts        # regra de negócio pura (a fonte da verdade da cascata)
  config-store.ts   # armazenamento em memória dos parâmetros
  admin-auth.ts      # sessão do painel do gestor
  format.ts          # formatação de moeda
components/
  ResultadoCard.tsx  # card de detalhamento no estilo "recibo"
tests/
  pricing.test.ts    # testes contra os casos de validação do desafio
CLAUDE.md         # contexto para um agente de IA continuar o projeto
RELATORIO.md      # decisões, testes, fragilidades e dúvidas para o cliente
```
