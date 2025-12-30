import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

// RÉCUPÉRATION DES TEMPLATES
export async function GET() {
  try {
    // On récupère toute la liste des templates enregistrés
    const memes = await kv.lrange('meme:templates_list', 0, -1);
    return NextResponse.json(memes || []);
  } catch (error) {
    console.error("Erreur récupération memes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// SAUVEGARDE D'UN NOUVEAU TEMPLATE
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { item } = body; // 'item' est l'objet newMeme envoyé par ton éditeur

    if (!item || !item.url) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // On prépare l'objet pour la base de données
    const newTemplate = {
      ...item,
      id: item.id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    // On utilise LPUSH pour l'ajouter au début de la liste Redis
    // Clé utilisée : meme:templates_list
    await kv.lpush('meme:templates_list', newTemplate);

    return NextResponse.json({ success: true, meme: newTemplate });

  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}