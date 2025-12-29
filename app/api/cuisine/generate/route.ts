import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { ingredients } = await request.json();

    if (!ingredients) return NextResponse.json({ error: "Pas d'ingrédients" }, { status: 400 });

    const prompt = `
      Tu es un chef cuisinier créatif et anti-gaspi.
      J'ai ces ingrédients dans mon frigo/placard : "${ingredients}".
      
      Invente une recette gourmande qui utilise principalement ces ingrédients.
      Tu as le droit d'ajouter des ingrédients de base (sel, poivre, huile, beurre, farine, eau, lait, oignons, ail).
      
      Réponds UNIQUEMENT au format JSON strict suivant :
      {
        "title": "Nom créatif de la recette",
        "prepTime": "XX min",
        "cookTime": "XX min",
        "servings": "X",
        "ingredients": ["liste", "des", "ingrédients", "avec", "quantités"],
        "steps": ["étape 1", "étape 2"...]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Erreur génération");

    return NextResponse.json(JSON.parse(content));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Le chef n'a pas trouvé d'idée..." }, { status: 500 });
  }
}