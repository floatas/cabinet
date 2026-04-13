import { NextResponse } from "next/server";
import { getDaemonUrl } from "@/lib/runtime/runtime-config";

interface CachedStatus {
  providers: { id: string; name: string; available: boolean; authenticated: boolean }[];
  anyReady: boolean;
}

let cachedResult: CachedStatus | null = null;
let cachedAt = 0;
const CACHE_TTL = 30_000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedResult && now - cachedAt < CACHE_TTL) {
      return NextResponse.json(cachedResult);
    }

    // Proxy to daemon — it runs on the host where CLI tools are actually installed
    const res = await fetch(`${getDaemonUrl()}/providers/status`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Daemon returned ${res.status}`);
    }

    const response: CachedStatus = await res.json();
    cachedResult = response;
    cachedAt = now;

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
