import { ParametrosFinanceiros, PARAMETROS_PADRAO } from "./pricing";

/**
 * ATENÇÃO — armazenamento em memória.
 *
 * Isso guarda os parâmetros financeiros na memória do processo Node. Funciona
 * bem localmente e em `next start` de longa duração, mas em funções
 * serverless (Vercel) cada cold start recomeça do zero com PARAMETROS_PADRAO,
 * e múltiplas instâncias em paralelo podem ter valores divergentes entre si.
 *
 * Isso é uma fragilidade conhecida e documentada — ver RELATORIO.md, seção
 * "Onde a aplicação está frágil". Para produção, isso precisa virar uma
 * tabela em um banco de dados (Postgres, Vercel KV, etc.) com uma única
 * fonte de verdade.
 */
let configAtual: ParametrosFinanceiros = { ...PARAMETROS_PADRAO };

export function getConfig(): ParametrosFinanceiros {
  return { ...configAtual };
}

export function resetConfig(): ParametrosFinanceiros {
  configAtual = { ...PARAMETROS_PADRAO };
  return getConfig();
}

export function updateConfig(parcial: Record<string, unknown>): ParametrosFinanceiros {
  const chavesValidas = Object.keys(PARAMETROS_PADRAO) as (keyof ParametrosFinanceiros)[];
  const atualizado: Record<string, number> = { ...configAtual };

  for (const chave of Object.keys(parcial)) {
    if (!chavesValidas.includes(chave as keyof ParametrosFinanceiros)) {
      throw new Error(`Parâmetro desconhecido: "${chave}".`);
    }
    const valor = parcial[chave];
    if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) {
      throw new Error(`Valor inválido para "${chave}": deve ser um número maior ou igual a zero.`);
    }
    atualizado[chave] = valor;
  }

  configAtual = atualizado as unknown as ParametrosFinanceiros;
  return getConfig();
}
