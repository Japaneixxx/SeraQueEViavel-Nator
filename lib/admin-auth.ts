import { createHmac, timingSafeEqual } from "crypto";

/**
 * Autenticação minimalista para o painel do gestor.
 *
 * Uma única senha compartilhada (ADMIN_PASSWORD, variável de ambiente) libera
 * um cookie de sessão httpOnly assinado com HMAC. Não há usuários individuais
 * nem controle de quem é o "líder da equipe" — qualquer pessoa com a senha
 * entra. Isso é suficiente para o escopo deste desafio, mas é uma fragilidade
 * real para produção. Ver RELATORIO.md.
 */

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 horas
const COOKIE_NAME = "admin_session";

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    // Em desenvolvimento local isso permite rodar sem configurar tudo antes.
    // Em produção (ver README/RELATORIO.md) a variável deve ser definida.
    return "dev-secret-nao-use-em-producao";
  }
  return secret;
}

function assinar(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function compararEmTempoConstante(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function criarTokenDeSessao(): string {
  const expiraEm = Date.now() + SESSION_TTL_MS;
  const payload = String(expiraEm);
  return `${payload}.${assinar(payload)}`;
}

export function tokenValido(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return false;
  if (!compararEmTempoConstante(assinatura, assinar(payload))) return false;
  const expiraEm = Number(payload);
  if (!Number.isFinite(expiraEm)) return false;
  return Date.now() <= expiraEm;
}

export { COOKIE_NAME };
