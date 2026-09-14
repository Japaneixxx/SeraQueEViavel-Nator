"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ParametrosFinanceiros } from "@/lib/pricing";

type CampoPercentual = {
  chave: keyof ParametrosFinanceiros;
  rotulo: string;
  tipo: "percentual";
};
type CampoReais = {
  chave: keyof ParametrosFinanceiros;
  rotulo: string;
  tipo: "reais";
};
type Campo = CampoPercentual | CampoReais;

const campos: Campo[] = [
  { chave: "royaltiesPercentual", rotulo: "Royalties (sobre o valor bruto)", tipo: "percentual" },
  {
    chave: "royaltiesPercentualAcimaDoLimiar",
    rotulo: "Royalties acima do limiar (sobre o valor bruto)",
    tipo: "percentual",
  },
  {
    chave: "royaltiesLimiarValorBruto",
    rotulo: "Limiar de valor bruto para reduzir royalties",
    tipo: "reais",
  },
  { chave: "impostosPercentual", rotulo: "Impostos (sobre o valor após royalties)", tipo: "percentual" },
  { chave: "taxaPixPercentual", rotulo: "Taxa PIX (sobre o valor bruto)", tipo: "percentual" },
  { chave: "taxaCartaoPercentual", rotulo: "Taxa de cartão parcelado (sobre o valor bruto)", tipo: "percentual" },
  { chave: "taxaBoletoPorParcela", rotulo: "Taxa de boleto por parcela emitida", tipo: "reais" },
  { chave: "cspFixo", rotulo: "Custo de entrega do serviço (CSP), por contrato", tipo: "reais" },
  { chave: "comissaoPercentual", rotulo: "Comissão do vendedor (sobre a margem líquida)", tipo: "percentual" },
  {
    chave: "margemMinimaParaComissaoPercentual",
    rotulo: "Piso de margem líquida para haver comissão (% do valor bruto)",
    tipo: "percentual",
  },
];

/** Converte o valor interno (fração, ex: 0.18) para o texto do campo (ex: "18"). */
function paraTexto(campo: Campo, valor: number): string {
  const valorExibido = campo.tipo === "percentual" ? Math.round(valor * 100 * 100) / 100 : valor;
  return String(valorExibido);
}

/** Converte o texto do campo de volta para o valor interno (fração para percentuais). */
function paraValorInterno(campo: Campo, texto: string): number {
  const numero = Number(texto.replace(",", "."));
  return campo.tipo === "percentual" ? numero / 100 : numero;
}

export default function PaginaAdmin() {
  const [carregando, setCarregando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  async function carregarConfig() {
    setCarregando(true);
    const resposta = await fetch("/api/admin/config");
    if (resposta.ok) {
      const config: ParametrosFinanceiros = await resposta.json();
      const textos: Record<string, string> = {};
      for (const campo of campos) {
        textos[campo.chave] = paraTexto(campo, config[campo.chave]);
      }
      setValores(textos);
      setAutenticado(true);
    } else {
      setAutenticado(false);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregarConfig();
  }, []);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErroLogin(null);
    const resposta = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (resposta.ok) {
      setSenha("");
      await carregarConfig();
    } else {
      const dados = await resposta.json().catch(() => ({}));
      setErroLogin(dados.erro ?? "Não foi possível entrar.");
    }
  }

  async function sair() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAutenticado(false);
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setMensagem(null);

    const corpo: Record<string, number> = {};
    for (const campo of campos) {
      corpo[campo.chave] = paraValorInterno(campo, valores[campo.chave] ?? "");
    }

    const resposta = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = await resposta.json();
    if (resposta.ok) {
      setMensagem({ tipo: "sucesso", texto: "Parâmetros atualizados." });
    } else {
      setMensagem({ tipo: "erro", texto: dados.erro ?? "Não foi possível salvar." });
    }
    setSalvando(false);
  }

  if (carregando) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <p className="text-ink/60">Carregando…</p>
      </main>
    );
  }

  if (!autenticado) {
    return (
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="font-serif text-2xl text-paper">Painel do gestor</h1>
        <p className="mt-2 text-sm text-ink/60">
          Acesso restrito. Os parâmetros de custo não ficam visíveis para o time comercial.
        </p>
        <form onSubmit={entrar} className="mt-6 space-y-4">
          <div>
            <label htmlFor="senha" className="mb-2 block text-sm text-paper/80">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded border border-ink-border bg-ink-soft px-3 py-3 text-paper outline-none focus:border-brass"
            />
          </div>
          {erroLogin && (
            <p role="alert" className="text-sm text-signal-negative">
              {erroLogin}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded bg-brass py-3 font-medium text-ink hover:bg-brass-dim"
          >
            Entrar
          </button>
        </form>
        <Link href="/" className="mt-8 inline-block text-sm text-ink/50 underline underline-offset-4 hover:text-brass">
          Voltar para o simulador
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 sm:py-16">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-paper">Painel do gestor</h1>
          <p className="mt-2 text-ink/70">
            Estes parâmetros nunca são enviados para a tela do vendedor — só os valores calculados em R$.
          </p>
        </div>
        <button onClick={sair} className="shrink-0 text-sm text-ink/50 underline underline-offset-4 hover:text-brass">
          Sair
        </button>
      </header>

      <form onSubmit={salvar} className="space-y-5 rounded border border-ink-border bg-ink-soft p-6">
        {campos.map((campo) => (
          <div key={campo.chave}>
            <label htmlFor={campo.chave} className="mb-2 block text-sm text-paper/80">
              {campo.rotulo}
            </label>
            <div className="flex items-center rounded border border-ink-border bg-ink px-3 focus-within:border-brass">
              {campo.tipo === "reais" && <span className="text-paper/50">R$</span>}
              <input
                id={campo.chave}
                inputMode="decimal"
                required
                value={valores[campo.chave] ?? ""}
                onChange={(e) => setValores((v) => ({ ...v, [campo.chave]: e.target.value }))}
                className="w-full bg-transparent px-2 py-3 text-paper tabular-nums outline-none"
              />
              {campo.tipo === "percentual" && <span className="text-paper/50">%</span>}
            </div>
          </div>
        ))}

        {mensagem && (
          <p
            role="alert"
            className={`text-sm ${mensagem.tipo === "sucesso" ? "text-signal-positive" : "text-signal-negative"}`}
          >
            {mensagem.texto}
          </p>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="w-full rounded bg-brass py-3 font-medium text-ink hover:bg-brass-dim disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar parâmetros"}
        </button>
      </form>

      <Link href="/" className="mt-8 inline-block text-sm text-ink/50 underline underline-offset-4 hover:text-brass">
        Voltar para o simulador
      </Link>
    </main>
  );
}
