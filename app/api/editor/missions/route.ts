import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  if (!gameId) return NextResponse.json({ error: "Missing gameId" }, { status: 400 });

  // On récupère les données (typées explicitement pour éviter l'erreur de l'image)
  let missions = await kv.get<any[]>(`missions:${gameId}`);

  // Initialisation si vide ou null
  if (!missions || missions.length === 0) {
    if (gameId === 'zoom') {
      missions = [
        "Un truc tout doux", "Un truc qui gratte", "Quelque chose en bois", 
        "Quelque chose en métal", "Un tissu avec des motifs", "Une matière plastique",
        "Un truc transparent (verre, eau...)", "Un truc rugueux ou abîmé", 
        "Un objet tout rouge", "Un objet tout bleu", "Un objet noir", 
        "Un truc multicolore", "Quelque chose de jaune", "Un truc qui se mange", 
        "Un truc qui se boit", "Un objet de la salle de bain", 
        "Un truc qui traîne sur ton bureau", "Un vêtement que tu portes", 
        "Un truc qui s'allume", "Une plante ou une fleur", "Un truc qui sent fort", 
        "Un morceau de ta main", "Un morceau de ton visage", "Ta peau (de très près)", 
        "Tes cheveux ou poils", "Un truc rond", "Un truc avec des écritures", 
        "Un truc sale ou poussiéreux", "Ton objet préféré", "Le truc le plus moche de la pièce"
      ];
    } else if (gameId === 'meme') {
      missions = []; // L'utilisateur créera ses templates via le studio
    }

    // Sauvegarde initiale si on a généré une liste
    if (missions && missions.length > 0) {
      await kv.set(`missions:${gameId}`, missions);
    }
  }

  return NextResponse.json({ missions: missions || [] });
}

export async function POST(request: Request) {
  try {
    const { gameId, missions } = await request.json();
    await kv.set(`missions:${gameId}`, missions);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur POST" }, { status: 500 });
  }
}