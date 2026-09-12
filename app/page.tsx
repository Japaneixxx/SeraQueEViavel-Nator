"use client";

import { useState } from "react";
import Link from "next/link";
import { ResultadoCard } from "@/components/ResultadoCard";
import type { FormaPagamento, SimulacaoResultado } from "@/lib/pricing";

const opcoesFormaPagamento: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "pix", rotulo: "PIX" },
  { valor: "cartao", rotulo: "Cartão parcelado" },
  { valor: "boleto", rotulo: "Boleto" },
];

export default function PaginaSimulador() {
  const [valorBruto, setValorBruto] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");
  const [parcelas, setParcelas] = useState("1");
  const [resultado, setResultado] = useState<SimulacaoResultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const precisaParcelas = formaPagamento !== "pix";

  async function simular(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const resposta = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valorBruto: Number(valorBruto.replace(",", ".")),
          formaPagamento,
          parcelas: precisaParcelas ? Number(parcelas) : 1,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível simular.");
        setResultado(null);
        return;
      }
      setResultado(dados);
    } catch {
      setErro("Não foi possível conectar ao servidor. Tente novamente.");
      setResultado(null);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-16">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-paper sm:text-4xl">Simulador de Viabilidade</h1>
          <p className="mt-2 max-w-md text-ink/70">
            Informe o valor do contrato e a forma de pagamento para ver, na hora, se a venda continua
            viável.
          </p>
        </div>
        <Link
          href="/admin"
          className="shrink-0 text-sm text-ink/50 underline decoration-ink/30 underline-offset-4 hover:text-brass"
        >
          Painel do gestor
        </Link>
      </header>

      <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
        <form
          onSubmit={simular}
          className="h-fit space-y-6 rounded border border-ink-border bg-ink-soft p-6"
        >
          <div>
            <label htmlFor="valorBruto" className="mb-2 block text-sm text-paper/80">
              Valor bruto do contrato
            </label>
            <div className="flex items-center rounded border border-ink-border bg-ink px-3 focus-within:border-brass">
              <span className="text-paper/50">R$</span>
              <input
                id="valorBruto"
                inputMode="decimal"
                required
                value={valorBruto}
                onChange={(e) => setValorBruto(e.target.value)}
                placeholder="10.000,00"
                className="w-full bg-transparent px-2 py-3 text-paper tabular-nums outline-none placeholder:text-paper/30"
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 block text-sm text-paper/80">Forma de pagamento</legend>
            <div className="space-y-2">
              {opcoesFormaPagamento.map((opcao) => (
                <label
                  key={opcao.valor}
                  className="flex cursor-pointer items-center gap-3 rounded border border-ink-border px-3 py-2.5 has-[:checked]:border-brass"
                >
                  <input
                    type="radio"
                    name="formaPagamento"
                    value={opcao.valor}
                    checked={formaPagamento === opcao.valor}
                    onChange={() => setFormaPagamento(opcao.valor)}
                    className="accent-brass"
                  />
                  <span className="text-paper/90">{opcao.rotulo}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {precisaParcelas && (
            <div>
              <label htmlFor="parcelas" className="mb-2 block text-sm text-paper/80">
                Número de parcelas
              </label>
              <input
                id="parcelas"
                type="number"
                min={1}
                step={1}
                required
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                className="w-full rounded border border-ink-border bg-ink px-3 py-3 text-paper tabular-nums outline-none focus:border-brass"
              />
            </div>
          )}

          {erro && (
            <p role="alert" className="rounded border border-signal-negative/40 bg-signal-negative/10 px-3 py-2 text-sm text-signal-negative">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded bg-brass py-3 font-medium text-ink transition-colors hover:bg-brass-dim disabled:opacity-60"
          >
            {carregando ? "Simulando…" : "Simular"}
          </button>
        </form>

        <div>
          {resultado ? (
            <ResultadoCard resultado={resultado} />
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded border border-dashed border-ink-border p-8 text-center text-ink/50">
              Preencha o valor e a forma de pagamento para ver o detalhamento da margem e da comissão.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
