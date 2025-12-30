import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cycleStart } = body; 

    if (!cycleStart) {
        return NextResponse.json({ error: "Date manquante" }, { status: 400 });
    }

    // On sauvegarde avec le préfixe 'pilule:' pour que ce soit propre
    await kv.set('pilule:cycle_start', cycleStart);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur sauvegarde cycle:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}