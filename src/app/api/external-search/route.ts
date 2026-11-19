import { NextResponse } from "next/server";
import { z } from "zod";
import { isMetaSearchEnabled, searchExternal } from "@/lib/meta-search";

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Neplatny dopyt." }, { status: 400 });
  }

  if (!isMetaSearchEnabled()) {
    return NextResponse.json(
      { enabled: false, error: "Vyhladavanie na portaloch nie je aktivovane." },
      { status: 503 }
    );
  }

  try {
    const items = await searchExternal(parsed.data.q, 10);
    return NextResponse.json({ enabled: true, items });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "neznama chyba";
    console.error("external-search failed:", reason);
    return NextResponse.json(
      { enabled: true, error: `Vyhladavanie zlyhalo: ${reason}` },
      { status: 502 }
    );
  }
}
