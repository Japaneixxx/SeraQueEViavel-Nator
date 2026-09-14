/**
 * Regras de negócio do simulador de viabilidade de venda.
 *
 * Este módulo é intencionalmente puro (sem I/O, sem Next.js, sem React) para
 * que possa ser testado isoladamente e para deixar claro, em um único lugar,
 * qual é a fonte da verdade da cascata de deduções.
 *
 * IMPORTANTE (leia antes de mexer aqui):
 * A ordem das deduções importa. Cada etapa muda a base de cálculo da
 * seguinte. Ver RELATORIO.md, seção "Inconsistência encontrada nos casos de
 * validação", para uma discrepância identificada entre o caso de validação
 * nº 1 do desafio e a regra de negócio escrita — este código segue a regra
 * escrita, não o número da tabela.
 *
 * Desde a entrega inicial, os royalties passaram a ser escalonados: acima
 * de um limiar de valor bruto (padrão R$ 20.000, configurável), o
 * percentual de royalties cai de 18% para 15% (também configurável). Ver
 * RELATORIO.md, seção "Alterações após a entrega inicial".
 */

export type FormaPagamento = "pix" | "cartao" | "boleto";

export interface ParametrosFinanceiros {
  /** Percentual de royalties sobre o valor bruto do contrato, para contratos até o limiar. Ex: 0.18 = 18% */
  royaltiesPercentual: number;
  /**
   * Percentual de royalties para contratos com valor bruto ACIMA de
   * `royaltiesLimiarValorBruto`. Ex: 0.15 = 15%.
   */
  royaltiesPercentualAcimaDoLimiar: number;
  /**
   * Valor bruto (R$) a partir do qual passa a valer
   * `royaltiesPercentualAcimaDoLimiar` no lugar de `royaltiesPercentual`.
   * A comparação é estrita: só se aplica a contratos ACIMA deste valor, não
   * a contratos exatamente iguais a ele. Ex: 20000.
   */
  royaltiesLimiarValorBruto: number;
  /** Percentual de impostos sobre o valor já deduzido dos royalties. Ex: 0.11 = 11% */
  impostosPercentual: number;
  /** Percentual da taxa de PIX sobre o valor bruto. Ex: 0.015 = 1,5% */
  taxaPixPercentual: number;
  /** Percentual da taxa de cartão parcelado sobre o valor bruto. Ex: 0.14 = 14% */
  taxaCartaoPercentual: number;
  /** Valor fixo (R$) cobrado por parcela emitida no boleto. Ex: 4.90 */
  taxaBoletoPorParcela: number;
  /** Custo de entrega do serviço (CSP), valor fixo (R$) por contrato. Ex: 3500 */
  cspFixo: number;
  /** Percentual de comissão do vendedor sobre a margem líquida. Ex: 0.12 = 12% */
  comissaoPercentual: number;
  /**
   * Percentual mínimo que a margem líquida precisa representar do valor
   * bruto para que a comissão seja devida. Ex: 0.15 = 15%
   */
  margemMinimaParaComissaoPercentual: number;
}

export const PARAMETROS_PADRAO: ParametrosFinanceiros = {
  royaltiesPercentual: 0.18,
  royaltiesPercentualAcimaDoLimiar: 0.15,
  royaltiesLimiarValorBruto: 20000,
  impostosPercentual: 0.11,
  taxaPixPercentual: 0.015,
  taxaCartaoPercentual: 0.14,
  taxaBoletoPorParcela: 4.9,
  cspFixo: 3500,
  comissaoPercentual: 0.12,
  margemMinimaParaComissaoPercentual: 0.15,
};

export interface SimulacaoInput {
  valorBruto: number;
  formaPagamento: FormaPagamento;
  /** Número de parcelas. Obrigatório e >= 1 para cartão e boleto. Ignorado no PIX. */
  parcelas?: number;
}

export interface SimulacaoResultado {
  valorBruto: number;
  formaPagamento: FormaPagamento;
  parcelas: number;
  royalties: number;
  /** true quando o valor bruto ficou acima do limiar e o percentual reduzido de royalties foi aplicado. */
  royaltiesReduzidos: boolean;
  valorAposRoyalties: number;
  impostos: number;
  taxaFormaPagamento: number;
  csp: number;
  margemLiquida: number;
  margemLiquidaPercentualDoBruto: number;
  comissaoAplicavel: boolean;
  comissao: number;
  resultadoFinal: number;
}

export class EntradaInvalidaError extends Error {}

export function simular(
  input: SimulacaoInput,
  params: ParametrosFinanceiros = PARAMETROS_PADRAO
): SimulacaoResultado {
  const { valorBruto, formaPagamento } = input;
  const parcelas = input.parcelas && input.parcelas > 0 ? Math.floor(input.parcelas) : 1;

  if (!Number.isFinite(valorBruto) || valorBruto <= 0) {
    throw new EntradaInvalidaError("Valor bruto do contrato deve ser maior que zero.");
  }
  if (!["pix", "cartao", "boleto"].includes(formaPagamento)) {
    throw new EntradaInvalidaError("Forma de pagamento inválida.");
  }
  if ((formaPagamento === "cartao" || formaPagamento === "boleto") && parcelas < 1) {
    throw new EntradaInvalidaError("Número de parcelas inválido para a forma de pagamento selecionada.");
  }

  // 1. Royalties — sobre o valor bruto do contrato. Contratos com valor
  // bruto ACIMA do limiar usam o percentual reduzido (comparação estrita:
  // um contrato exatamente igual ao limiar ainda usa o percentual normal).
  const royaltiesReduzidos = valorBruto > params.royaltiesLimiarValorBruto;
  const royaltiesPercentualAplicado = royaltiesReduzidos
    ? params.royaltiesPercentualAcimaDoLimiar
    : params.royaltiesPercentual;
  const royalties = arredondar(valorBruto * royaltiesPercentualAplicado);

  // 2. Impostos — sobre o valor já deduzido dos royalties (não sobre o bruto).
  const valorAposRoyalties = arredondar(valorBruto - royalties);
  const impostos = arredondar(valorAposRoyalties * params.impostosPercentual);

  // 3. Taxa da forma de pagamento — sempre incide sobre o valor bruto.
  const taxaFormaPagamento = calcularTaxaFormaPagamento(formaPagamento, valorBruto, parcelas, params);

  // 4. CSP — valor fixo por contrato.
  const csp = params.cspFixo;

  // 5. Margem líquida — o que sobra após as quatro deduções acima.
  const margemLiquida = arredondar(valorBruto - royalties - impostos - taxaFormaPagamento - csp);
  const margemLiquidaPercentualDoBruto = margemLiquida / valorBruto;

  // 6. Comissão — 12% da margem líquida, só se margem líquida >= 15% do bruto.
  const comissaoAplicavel = margemLiquidaPercentualDoBruto >= params.margemMinimaParaComissaoPercentual;
  const comissao = comissaoAplicavel ? arredondar(margemLiquida * params.comissaoPercentual) : 0;

  const resultadoFinal = arredondar(margemLiquida - comissao);

  return {
    valorBruto,
    formaPagamento,
    parcelas,
    royalties,
    royaltiesReduzidos,
    valorAposRoyalties,
    impostos,
    taxaFormaPagamento,
    csp,
    margemLiquida,
    margemLiquidaPercentualDoBruto,
    comissaoAplicavel,
    comissao,
    resultadoFinal,
  };
}

function calcularTaxaFormaPagamento(
  forma: FormaPagamento,
  valorBruto: number,
  parcelas: number,
  params: ParametrosFinanceiros
): number {
  switch (forma) {
    case "pix":
      return arredondar(valorBruto * params.taxaPixPercentual);
    case "cartao":
      return arredondar(valorBruto * params.taxaCartaoPercentual);
    case "boleto":
      return arredondar(params.taxaBoletoPorParcela * parcelas);
  }
}

/** Arredondamento bancário simples para 2 casas decimais (centavos). */
function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
