import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, tokenValido } from "@/lib/admin-auth";
import { getConfig, updateConfig } from "@/lib/config-store";

function autorizado(req: NextRequest): boolean {
  return tokenValido(req.cookies.get(COOKIE_NAME)?.value);
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  return NextResponse.json(getConfig());
}

export async function PUT(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  try {
    const atualizado = updateConfig(body as Record<string, unknown>);
    return NextResponse.json(atualizado);
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 400 });
  }
}
