import { describe, expect, it } from "vitest";
import { simular, EntradaInvalidaError, PARAMETROS_PADRAO } from "../lib/pricing";

describe("simular — casos de validação do desafio", () => {
  /**
   * Caso 2 original do desafio: R$ 24.000 é ACIMA do limiar padrão de
   * royalties reduzidos (R$ 20.000, introduzido depois da entrega inicial —
   * ver RELATORIO.md, "Alterações após a entrega inicial"). Para preservar
   * este caso como regressão da regra original do desafio, desativamos a
   * faixa reduzida explicitamente (limiar maior que o valor bruto).
   */
  it("caso 2 (regra original, sem faixa reduzida): R$ 24.000, cartão em 12x", () => {
    const r = simular(
      { valorBruto: 24000, formaPagamento: "cartao", parcelas: 12 },
      { ...PARAMETROS_PADRAO, royaltiesLimiarValorBruto: 999999 }
    );
    expect(r.royaltiesReduzidos).toBe(false);
    expect(r.margemLiquida).toBeCloseTo(10655.2, 2);
    expect(r.comissao).toBeCloseTo(1278.62, 2);
    expect(r.resultadoFinal).toBeCloseTo(9376.58, 2);
  });

  it("caso 3: R$ 6.000, boleto em 6x — abaixo do piso de comissão", () => {
    const r = simular({ valorBruto: 6000, formaPagamento: "boleto", parcelas: 6 });
    expect(r.margemLiquida).toBeCloseTo(849.4, 2);
    expect(r.comissao).toBe(0);
    expect(r.resultadoFinal).toBeCloseTo(849.4, 2);
  });

  it("caso 4: R$ 4.000, cartão em 3x — resultado negativo", () => {
    const r = simular({ valorBruto: 4000, formaPagamento: "cartao", parcelas: 3 });
    expect(r.margemLiquida).toBeCloseTo(-1140.8, 2);
    expect(r.comissao).toBe(0);
    expect(r.resultadoFinal).toBeCloseTo(-1140.8, 2);
  });

  /**
   * Caso 1 do desafio (R$ 10.000, PIX, 1x) aparece na tabela do desafio com
   * margem líquida de R$ 3.450,00. Aplicando a regra escrita ao pé da letra
   * (royalties 18% sobre o bruto; impostos 11% sobre o valor já deduzido dos
   * royalties; taxa PIX 1,5% sobre o bruto; CSP fixo de R$ 3.500) o resultado
   * correto é R$ 3.648,00 — uma diferença de R$ 198,00.
   *
   * Os casos 2, 3 e 4 batem exatamente com a regra escrita (ver testes
   * acima), o que indica que a inconsistência está isolada no caso 1 da
   * tabela do desafio, não na regra. Ver RELATORIO.md para detalhes e para a
   * pergunta que isso gera para o cliente.
   *
   * Este teste documenta o valor que a implementação produz seguindo a regra
   * escrita — não o valor da tabela do desafio. R$ 10.000 fica abaixo do
   * limiar de royalties reduzidos, então não é afetado por essa regra.
   */
  it("caso 1: R$ 10.000, PIX — segue a regra escrita (ver nota sobre discrepância no RELATORIO.md)", () => {
    const r = simular({ valorBruto: 10000, formaPagamento: "pix" });
    expect(r.royalties).toBeCloseTo(1800, 2);
    expect(r.royaltiesReduzidos).toBe(false);
    expect(r.impostos).toBeCloseTo(902, 2);
    expect(r.taxaFormaPagamento).toBeCloseTo(150, 2);
    expect(r.margemLiquida).toBeCloseTo(3648, 2);
    expect(r.comissao).toBeCloseTo(437.76, 2);
    expect(r.resultadoFinal).toBeCloseTo(3210.24, 2);
  });
});

describe("simular — royalties escalonados por valor bruto", () => {
  it("contrato acima do limiar (padrão R$ 20.000) usa o percentual reduzido", () => {
    const r = simular({ valorBruto: 24000, formaPagamento: "cartao", parcelas: 12 });
    expect(r.royaltiesReduzidos).toBe(true);
    expect(r.royalties).toBeCloseTo(3600, 2); // 15% de 24.000
    expect(r.margemLiquida).toBeCloseTo(11296, 2);
    expect(r.comissao).toBeCloseTo(1355.52, 2);
    expect(r.resultadoFinal).toBeCloseTo(9940.48, 2);
  });

  it("contrato exatamente no limiar ainda usa o percentual normal ('acima de', não 'a partir de')", () => {
    const r = simular({ valorBruto: 20000, formaPagamento: "pix" });
    expect(r.royaltiesReduzidos).toBe(false);
    expect(r.royalties).toBeCloseTo(3600, 2); // 18% de 20.000
  });

  it("contrato um centavo acima do limiar já usa o percentual reduzido", () => {
    const r = simular({ valorBruto: 20000.01, formaPagamento: "pix" });
    expect(r.royaltiesReduzidos).toBe(true);
  });

  it("contrato abaixo do limiar usa o percentual normal", () => {
    const r = simular({ valorBruto: 15000, formaPagamento: "pix" });
    expect(r.royaltiesReduzidos).toBe(false);
    expect(r.royalties).toBeCloseTo(2700, 2); // 18% de 15.000
  });

  it("limiar e percentual reduzido são configuráveis (uso do painel do gestor)", () => {
    const r = simular(
      { valorBruto: 5000, formaPagamento: "pix" },
      { ...PARAMETROS_PADRAO, royaltiesLimiarValorBruto: 4000, royaltiesPercentualAcimaDoLimiar: 0.05 }
    );
    expect(r.royaltiesReduzidos).toBe(true);
    expect(r.royalties).toBeCloseTo(250, 2); // 5% de 5.000
  });
});

describe("simular — validações e formas de pagamento", () => {
  it("rejeita valor bruto zero ou negativo", () => {
    expect(() => simular({ valorBruto: 0, formaPagamento: "pix" })).toThrow(EntradaInvalidaError);
    expect(() => simular({ valorBruto: -100, formaPagamento: "pix" })).toThrow(EntradaInvalidaError);
  });

  it("rejeita forma de pagamento desconhecida", () => {
    expect(() =>
      simular({ valorBruto: 1000, formaPagamento: "cripto" as never })
    ).toThrow(EntradaInvalidaError);
  });

  it("boleto: taxa escala com o número de parcelas", () => {
    const r1 = simular({ valorBruto: 1000, formaPagamento: "boleto", parcelas: 1 });
    const r10 = simular({ valorBruto: 1000, formaPagamento: "boleto", parcelas: 10 });
    expect(r1.taxaFormaPagamento).toBeCloseTo(4.9, 2);
    expect(r10.taxaFormaPagamento).toBeCloseTo(49.0, 2);
  });

  it("PIX ignora número de parcelas informado", () => {
    const r = simular({ valorBruto: 1000, formaPagamento: "pix", parcelas: 5 });
    expect(r.taxaFormaPagamento).toBeCloseTo(15, 2);
  });

  it("respeita parâmetros customizados (usados pelo painel do gestor)", () => {
    const r = simular(
      { valorBruto: 10000, formaPagamento: "pix" },
      {
        royaltiesPercentual: 0.1,
        royaltiesPercentualAcimaDoLimiar: 0.1,
        royaltiesLimiarValorBruto: 999999,
        impostosPercentual: 0.1,
        taxaPixPercentual: 0.01,
        taxaCartaoPercentual: 0.1,
        taxaBoletoPorParcela: 1,
        cspFixo: 1000,
        comissaoPercentual: 0.1,
        margemMinimaParaComissaoPercentual: 0.1,
      }
    );
    // 10000 - 1000 (royalties) - 900 (10% de 9000) - 100 (taxa) - 1000 (csp) = 7000
    expect(r.margemLiquida).toBeCloseTo(7000, 2);
    expect(r.comissao).toBeCloseTo(700, 2);
  });
});
