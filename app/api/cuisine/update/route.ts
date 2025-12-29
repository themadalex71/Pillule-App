import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
  try {
    const { recipe } = await request.json();

    if (!recipe || !recipe.id) {
        return NextResponse.json({ error: "Recette invalide" }, { status: 400 });
    }

    // 1. On récupère toutes les recettes pour trouver la bonne position
    const allRecipes: any[] = await kv.lrange('recipes_list', 0, -1);
    
    // 2. On trouve l'index de la recette à modifier
    const index = allRecipes.findIndex((r) => r.id === recipe.id);

    if (index === -1) {
        return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
    }

    // 3. On écrase l'ancienne version avec la nouvelle (LSET)
    await kv.lset('recipes_list', index, recipe);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur update:", error);
    return NextResponse.json({ error: "Erreur lors de la modification" }, { status: 500 });
  }
}