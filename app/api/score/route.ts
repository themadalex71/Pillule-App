import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // On génère une clé basée sur l'année et le numéro de semaine
    const now = new Date();
    const weekKey = `leaderboard:${now.getFullYear()}-W${getWeekNumber(now)}`;
    
    // On récupère tout le classement (nom + score)
    const scores = await kv.zrange(weekKey, 0, -1, { withScores: true, rev: true });
    
    return NextResponse.json(scores);
  } catch (error) {
    return NextResponse.json({ error: "Erreur scores" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, points } = await req.json();
    const now = new Date();
    const weekKey = `leaderboard:${now.getFullYear()}-W${getWeekNumber(now)}`;

    // ZINCRBY ajoute les points au score existant de l'utilisateur
    await kv.zincrby(weekKey, points, user);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur ajout score" }, { status: 500 });
  }
}

// Fonction utilitaire pour calculer le numéro de semaine
function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}