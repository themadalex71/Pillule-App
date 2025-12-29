import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  // On initialise l'IA DANS la fonction
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { text } = await request.json();

    if (!text) return NextResponse.json({ error: "Aucun texte fourni" }, { status: 400 });

    const prompt = `
      Tu es un chef étoilé expert. J'ai copié la description d'une vidéo de cuisine (Instagram/TikTok) :
      "${text}"
      
      Ta mission est de structurer cette recette.
      
      IMPORTANT - LES ÉTAPES :
      Souvent, les descriptions Instagram ne contiennent QUE les ingrédients.
      1. Si les étapes sont écrites dans le texte, reformule-les clairement.
      2. **SI LES ÉTAPES SONT ABSENTES : TU DOIS LES DÉDUIRE/GÉNÉRER TOI-MÊME** de façon logique et professionnelle, en te basant sur la liste des ingrédients et le titre supposé du plat. Ne laisse JAMAIS le champ "steps" vide.
      
      IMPORTANT - LES INGRÉDIENTS :
      Sépare bien la quantité du nom.
      - "200g de Farine" -> quantity: "200g", name: "Farine"
      - "Sel" -> quantity: "", name: "Sel"

      Renvoie UNIQUEMENT un JSON strict respectant ce format :
      {
        "title": "Nom du plat (déduis-le si nécessaire)",
        "prepTime": "XX min (estimation si absent)",
        "cookTime": "XX min (estimation si absent)",
        "servings": "X pers (par défaut 2 si absent)",
        "ingredients": [
          { "quantity": "...", "name": "..." }
        ],
        "steps": [
          "Étape 1...",
          "Étape 2...",
          "Étape 3..."
        ]
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