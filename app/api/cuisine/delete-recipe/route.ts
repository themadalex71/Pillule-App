import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // 1. On récupère la liste complète
    const recipes: any[] = await kv.lrange('cuistot:recipes_list', 0, -1);
    
    // 2. On filtre pour enlever la recette ciblée
    const newRecipes = recipes.filter(r => r.id !== id);

    // 3. On écrase l'ancienne liste avec la nouvelle
    await kv.del('cuistot:recipes_list');
    if (newRecipes.length > 0) {
        await kv.rpush('cuistot:recipes_list', ...newRecipes);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}