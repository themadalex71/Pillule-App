import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
  try {
    const { categories } = await request.json();

    if (!categories) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    // On écrase la configuration existante avec la nouvelle
    await kv.set('cuistot:categories_config', categories);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur sauvegarde catégories:", error);
    return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
  }
}