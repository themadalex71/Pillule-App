import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipe, userId } = body;

    if (!recipe) return NextResponse.json({ error: "Pas de recette" }, { status: 400 });

    // On génère un ID unique basé sur l'heure (simple et efficace)
    const recipeId = Date.now().toString();
    
    const newRecipe = {
        id: recipeId,
        ...recipe,
        addedBy: userId || 'Inconnu',
        createdAt: new Date().toISOString()
    };

    // On stocke dans une liste "recipes"
    // On utilise LPUSH pour mettre les nouvelles en premier
    await kv.lpush('cuistot:recipes_list', recipe);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur sauvegarde" }, { status: 500 });
  }
}