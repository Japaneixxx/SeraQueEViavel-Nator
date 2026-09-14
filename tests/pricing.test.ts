import { describe, expect, it } from "vitest";
import { simular, EntradaInvalidaError, PARAMETROS_PADRAO } from "../lib/pricing";

describe("simular — casos de validação do desafio", () => {
  /**
   * Caso 2 agora usa a regra nova de royalties: como R$ 24.000 fica acima do
   * limiar configurado, o percentual aplicado cai para 15%.
   */
  it("caso 2: R$ 24.000, cartão em 12x — com royalties reduzidos", () => {
    const r = simular({ valorBruto: 24000, formaPagamento: "cartao", parcelas: 12 });
    expect(r.royaltiesReduzidos).toBe(true);
    expect(r.royalties).toBeCloseTo(3600, 2);
    expect(r.margemLiquida).toBeCloseTo(11296, 2);
    expect(r.comissao).toBeCloseTo(1355.52, 2);
    expect(r.resultadoFinal).toBeCloseTo(9940.48, 2);
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
   * Caso 1 do desafio (R$ 10.000, PIX, 1x) segue abaixo do limiar e, por
   * isso, continua usando 18% de royalties.
   */
  it("caso 1: R$ 10.000, PIX — abaixo do limiar de royalties reduzidos", () => {
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
