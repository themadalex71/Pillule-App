import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
  try {
    const { aliases } = await request.json();
    await kv.set('aliases_config', aliases);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
  }
}