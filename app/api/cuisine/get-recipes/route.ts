import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Très important : empêche le navigateur de garder une vieille liste en mémoire
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. On cherche les recettes avec le NOUVEAU préfixe "cuistot:"
    const recipes = await kv.lrange('cuistot:recipes_list', 0, -1);
    
    // 2. (Sécurité) Si la liste est vide, on regarde si par hasard elles ne sont pas dans l'ancien format
    // Ça permet de récupérer tes anciennes recettes si elles existent
    if (!recipes || recipes.length === 0) {
        const oldRecipes = await kv.lrange('recipes_list', 0, -1);
        if (oldRecipes && oldRecipes.length > 0) {
            return NextResponse.json(oldRecipes);
        }
    }

    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Erreur récupération recettes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}