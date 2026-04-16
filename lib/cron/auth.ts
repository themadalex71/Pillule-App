import { NextResponse } from "next/server";

function getIncomingSecret(request: Request) {
  const url = new URL(request.url);
  const querySecret = String(url.searchParams.get("secret") || "").trim();
  const headerSecret = String(request.headers.get("x-cron-secret") || "").trim();
  return querySecret || headerSecret;
}

export function ensureCronAuthorized(request: Request) {
  const expectedSecret = String(process.env.CRON_SECRET || "").trim();
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET manquant sur le serveur." },
      { status: 500 },
    );
  }

  const incomingSecret = getIncomingSecret(request);
  if (!incomingSecret || incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  return null;
}
