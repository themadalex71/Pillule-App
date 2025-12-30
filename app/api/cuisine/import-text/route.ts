import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { text } = await request.json();

    if (!text) return NextResponse.json({ error: "Aucun texte fourni" }, { status: 400 });

    const prompt = `
      Tu es un chef étoilé français expert. J'ai copié la description d'une vidéo de cuisine (Instagram/TikTok).
      
      CONTENU À ANALYSER : "${text}"
      
      🔎 MISSION PRINCIPALE : 
      1. Analyse le texte.
      2. **TRADUCTION : Si le texte est dans une autre langue (Anglais, Espagnol, etc.), TRADUIS TOUT EN FRANÇAIS.** Le titre, les ingrédients et les étapes doivent être en français impeccable.
      
      📦 FORMAT DES DONNÉES :
      Extrais les données au format JSON strict suivant :
      
      - INGRÉDIENTS : Sépare bien la quantité du nom.
        Ex: "200g Flour" devient -> { "quantity": "200g", "name": "Farine" }
        Ex: "Salt" -> { "quantity": "", "name": "Sel" }
      
      - ÉTAPES :
        Si elles sont présentes : Traduis-les.
        Si elles sont ABSENTES : **DÉDUIS-LES** logiquement à partir des ingrédients et du titre. Ne laisse jamais ce champ vide.

      Format attendu (JSON) :
      {
        "title": "Nom du plat en Français",
        "prepTime": "XX min (estimation)",
        "cookTime": "XX min (estimation)",
        "servings": "X pers (défaut 2)",
        "ingredients": [
          { "quantity": "...", "name": "..." }
        ],
        "steps": [
          "Étape 1 en français...",
          "Étape 2 en français..."
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