import { NextResponse } from "next/server";
import { ensureDefaultAppData } from "@/lib/app-config";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;

    if (action === "bootstrap") {
      await ensureDefaultAppData();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Action inconnue." },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/app error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}