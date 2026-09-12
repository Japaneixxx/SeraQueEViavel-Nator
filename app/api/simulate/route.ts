import { NextRequest, NextResponse } from "next/server";
import { EntradaInvalidaError, FormaPagamento, simular } from "@/lib/pricing";
import { getConfig } from "@/lib/config-store";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { valorBruto, formaPagamento, parcelas } = body as {
    valorBruto?: unknown;
    formaPagamento?: unknown;
    parcelas?: unknown;
  };

  try {
    const resultado = simular(
      {
        valorBruto: Number(valorBruto),
        formaPagamento: formaPagamento as FormaPagamento,
        parcelas: parcelas === undefined ? undefined : Number(parcelas),
      },
      getConfig()
    );

    // Importante: "resultado" traz só valores em R$ já calculados.
    // Os percentuais/parâmetros de custo (getConfig()) nunca são enviados
    // ao cliente por esta rota — é assim que a ferramenta esconde os
    // parâmetros sensíveis dos vendedores sem duplicar a regra de negócio
    // no front-end. Ver RELATORIO.md, "Decisões técnicas".
    return NextResponse.json(resultado);
  } catch (e) {
    if (e instanceof EntradaInvalidaError) {
      return NextResponse.json({ erro: e.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ erro: "Erro inesperado ao simular." }, { status: 500 });
  }
}
