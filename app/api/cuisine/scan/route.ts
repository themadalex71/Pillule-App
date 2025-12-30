import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { imagesBase64 } = await request.json();

    if (!imagesBase64 || imagesBase64.length === 0) {
      return NextResponse.json({ error: "Aucune image fournie" }, { status: 400 });
    }

    const contentMessage: any[] = [
      { 
        type: "text", 
        text: `Tu es un assistant culinaire français. J'ai pris des photos d'une recette.
        
        🔎 MISSION :
        1. Analyse les images pour reconstituer la recette.
        2. **TRADUCTION OBLIGATOIRE : Quelle que soit la langue sur la photo, fournis le résultat EN FRANÇAIS.**
        
        📦 FORMAT JSON STRICT :
        - title: Nom de la recette (en Français)
        - prepTime: Temps prépa (ex: "15 min")
        - cookTime: Temps cuisson (ex: "20 min")
        - servings: Nombre de personnes
        
        - ingredients: Tableau d'objets. TRADUIS les noms en français.
          Ex: "1 cup Sugar" -> { "quantity": "200g", "name": "Sucre" } (Convertis les unités si possible, sinon garde l'unité d'origine mais traduis le nom).
        
        - steps: Tableau d'étapes (en Français). Si elles manquent, déduis-les.
        
        Si ce n'est pas une recette, renvoie { error: "Pas une recette" }.` 
      }
    ];

    imagesBase64.forEach((img: string) => {
        contentMessage.push({
            type: "image_url",
            image_url: { url: img }
        });
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: contentMessage }],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Pas de réponse IA");

    return NextResponse.json(JSON.parse(content));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur analyse" }, { status: 500 });
  }
}