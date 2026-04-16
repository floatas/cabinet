import { NextResponse } from "next/server";
import { REGISTRY_TEMPLATES } from "@/lib/registry/registry-manifest";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(1, Number(searchParams.get("limit")) || 10),
    REGISTRY_TEMPLATES.length,
  );
  return NextResponse.json({ templates: REGISTRY_TEMPLATES.slice(0, limit) });
}
