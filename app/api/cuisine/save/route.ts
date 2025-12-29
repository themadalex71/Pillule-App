import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipe, userId } = body;

    if (!recipe) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // On ajoute un ID unique et la date si ils n'existent pas
    const newRecipe = {
      ...recipe,
      id: recipe.id || Date.now().toString(),
      addedAt: new Date().toISOString(),
      addedBy: userId || 'Anonyme'
    };

    // IMPORTANT : On utilise le préfixe 'cuistot:' pour ne pas mélanger avec les films
    // On ajoute la recette au début de la liste (lpush)
    await kv.lpush('cuistot:recipes_list', newRecipe);

    return NextResponse.json({ success: true, recipe: newRecipe });

  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}