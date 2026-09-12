import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, criarTokenDeSessao } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { erro: "ADMIN_PASSWORD não está configurada no servidor. Veja o README." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { senha } = body as { senha?: unknown };
  if (typeof senha !== "string" || senha !== adminPassword) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_NAME, criarTokenDeSessao(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return resposta;
}

export async function DELETE() {
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return resposta;
}
