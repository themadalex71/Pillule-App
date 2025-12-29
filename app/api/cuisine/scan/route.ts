import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    // On reçoit maintenant un TABLEAU d'images
    const { imagesBase64 } = await request.json();

    if (!imagesBase64 || imagesBase64.length === 0) {
      return NextResponse.json({ error: "Aucune image fournie" }, { status: 400 });
    }

    // On prépare le contenu pour GPT (Texte + Liste d'images)
    const contentMessage: any[] = [
      { 
        type: "text", 
        text: `Tu es un assistant culinaire. J'ai pris plusieurs captures d'écran d'une MÊME recette. 
        Analyse toutes les images pour reconstituer la recette complète.
        Si des infos se répètent sur les images, ne les mets qu'une fois.
        
        Extrais les infos au format JSON strict :
        - title: Nom de la recette
        - prepTime: Temps prépa (ex: "15 min")
        - cookTime: Temps cuisson (ex: "20 min")
        - servings: Nombre de personnes (ex: "4")
        - ingredients: Tableau de strings
        - steps: Tableau d'étapes.
        
        Si ce n'est pas une recette, renvoie { error: "Pas une recette" }.` 
      }
    ];

    // On ajoute chaque image au message
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