import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  // On initialise l'IA DANS la fonction pour éviter l'erreur de build Vercel
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { text } = await request.json();

    if (!text) return NextResponse.json({ error: "Aucun texte fourni" }, { status: 400 });

    const prompt = `
      Tu es un expert culinaire. Analyse ce texte de recette (issu d'Instagram/TikTok) :
      "${text}"
      
      Extrais les données au format JSON strict suivant.
      IMPORTANT : Pour les ingrédients, sépare bien la quantité (nombre + unité) du nom de l'ingrédient.
      Si l'ingrédient est "2 belles tomates", quantity="2", name="tomates".
      Si l'ingrédient est "Sel", quantity="", name="Sel".

      Format attendu :
      {
        "title": "Titre",
        "prepTime": "XX min",
        "cookTime": "XX min",
        "servings": "X pers",
        "ingredients": [
          { "quantity": "200g", "name": "Farine" },
          { "quantity": "1 c.à.s", "name": "Huile d'olive" }
        ],
        "steps": ["Étape 1", "Étape 2"]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Erreur IA");

    return NextResponse.json(JSON.parse(content));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de lire ce texte." }, { status: 500 });
  }
}