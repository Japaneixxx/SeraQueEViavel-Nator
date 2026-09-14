import { formatarReais } from "@/lib/format";
import type { SimulacaoResultado } from "@/lib/pricing";

const rotuloFormaPagamento: Record<SimulacaoResultado["formaPagamento"], string> = {
  pix: "Taxa PIX",
  cartao: "Taxa de cartão parcelado",
  boleto: "Taxa de boleto",
};

export function ResultadoCard({ resultado }: { resultado: SimulacaoResultado }) {
  const positivo = resultado.resultadoFinal >= 0;

  return (
    <div className="rounded-sm border border-ink-border bg-paper text-ink px-6 py-6 sm:px-8 sm:py-8">
      <p className="text-sm text-ink/60 mb-4">Detalhamento da simulação</p>

      <dl className="space-y-2 text-[15px]">
        <Linha rotulo="Valor bruto do contrato" valor={resultado.valorBruto} />
        <Linha
          rotulo="Royalties"
          valor={-resultado.royalties}
          nota={resultado.royaltiesReduzidos ? "faixa reduzida" : undefined}
        />
        <Linha rotulo="Impostos" valor={-resultado.impostos} />
        <Linha rotulo={rotuloFormaPagamento[resultado.formaPagamento]} valor={-resultado.taxaFormaPagamento} />
        <Linha rotulo="Custo de entrega do serviço (CSP)" valor={-resultado.csp} />
      </dl>

      <div className="my-4 border-t border-dashed border-ink/25" />

      <dl className="space-y-1">
        <div className="flex items-baseline justify-between">
          <dt className="font-serif text-lg">Margem líquida da unidade</dt>
          <dd className="font-serif text-lg tabular-nums">{formatarReais(resultado.margemLiquida)}</dd>
        </div>
        <p className="text-xs text-ink/55">
          {(resultado.margemLiquidaPercentualDoBruto * 100).toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          % do valor bruto
          {resultado.comissaoAplicavel
            ? " — acima do piso de comissão"
            : " — abaixo do piso de comissão (15%)"}
        </p>
      </dl>

      <dl className="mt-3 space-y-2 text-[15px]">
        <Linha
          rotulo="Comissão do vendedor"
          valor={resultado.comissaoAplicavel ? -resultado.comissao : 0}
          nota={resultado.comissaoAplicavel ? undefined : "não devida nesta simulação"}
        />
      </dl>

      <div className="my-4 border-t-2 border-ink/70" />

      <div className="flex items-baseline justify-between">
        <p className="font-serif text-xl">Resultado final da unidade</p>
        <p
          className={`font-serif text-xl tabular-nums ${
            positivo ? "text-signal-positive" : "text-signal-negative"
          }`}
        >
          {formatarReais(resultado.resultadoFinal)}
        </p>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor, nota }: { rotulo: string; valor: number; nota?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink/75">
        {rotulo}
        {nota ? <span className="text-ink/45"> ({nota})</span> : null}
      </dt>
      <dd className="tabular-nums whitespace-nowrap">{formatarReais(valor)}</dd>
    </div>
  );
}
