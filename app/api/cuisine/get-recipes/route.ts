import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic'; // Important pour ne pas mettre en cache

// L'erreur vient souvent d'ici : il faut bien "export async function GET"
export async function GET() {
  try {
    // On récupère toute la liste 'recipes_list'
    const recipes = await kv.lrange('cuistot:recipes_list', 0, -1);
    
    return NextResponse.json(recipes || []);

  } catch (error) {
    console.error("Erreur récupération recettes:", error);
    return NextResponse.json({ error: "Impossible de charger les recettes" }, { status: 500 });
  }
}