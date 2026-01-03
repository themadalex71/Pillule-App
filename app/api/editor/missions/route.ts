import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');
  const category = searchParams.get('category');

  if (!gameId) return NextResponse.json({ error: "Missing gameId" }, { status: 400 });

  // 1. Clé Redis
  let redisKey = `missions:${gameId}`;
  if (gameId === 'poet' && category) {
    redisKey = `poet:${category}`;
  }

  // 2. Récupération
  let missions = await kv.get<any[]>(redisKey);

  // 3. SÉCURITÉ : Détection des "vieilles données" pour le Cadavre Exquis
  // Si on trouve des données mais que ce sont des simples textes (string), c'est l'ancien format !
  // On considère alors que la base est "corrompue" pour forcer la réinitialisation.
  const isCadavreCorrupted = gameId === 'cadavre' && missions && missions.length > 0 && typeof missions[0] === 'string';

  // 4. Initialisation (Si vide OU si données corrompues)
  if (!missions || missions.length === 0 || isCadavreCorrupted) {
    
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
    } 
    else if (gameId === 'meme') {
      missions = [];
    } 
    else if (gameId === 'cadavre') {
        // LES TEMPLATES CORRECTS (Objets complets)
        missions = [
            {
                id: "classique",
                title: "La Phrase Complexe",
                steps: [
                    { label: "Un Groupe Nominal (Sujet)", placeholder: "Ex: Le vieux grille-pain..." },
                    { label: "Un Adjectif", placeholder: "Ex: poilu, dépressive..." },
                    { label: "Un Verbe d'action", placeholder: "Ex: dévore, chatouille..." },
                    { label: "Un Adverbe", placeholder: "Ex: violemment, tendrement..." },
                    { label: "Un Complément d'Objet", placeholder: "Ex: un inspecteur..." },
                    { label: "Un Complément de Lieu", placeholder: "Ex: dans la baignoire..." }
                ]
            },
            {
                id: "condition",
                title: "Le Si... Alors...",
                steps: [
                    { label: "Si... (Sujet)", placeholder: "Ex: Si un lama unijambiste..." },
                    { label: "Verbe (Imparfait)", placeholder: "Ex: mangeait, pilotait..." },
                    { label: "Complément", placeholder: "Ex: une raclette..." },
                    { label: "Alors... (Nouveau Sujet)", placeholder: "Ex: alors le pape..." },
                    { label: "Verbe (Conditionnel)", placeholder: "Ex: exploserait..." },
                    { label: "Conclusion", placeholder: "Ex: avec joie..." }
                ]
            },
            {
                id: "relative",
                title: "Celui qui...",
                steps: [
                    { label: "Quelqu'un", placeholder: "Ex: Un dictateur..." },
                    { label: "Qui... (Action 1)", placeholder: "Ex: qui vole des bonbons..." },
                    { label: "Et qui... (Action 2)", placeholder: "Ex: et qui se frotte..." },
                    { label: "A rencontré...", placeholder: "Ex: a rencontré Batman..." },
                    { label: "Pour lui donner...", placeholder: "Ex: pour lui donner un bisou..." },
                    { label: "Conséquence", placeholder: "Ex: et c'était gênant..." }
                ]
            }
        ];
    } 
    else if (gameId === 'poet') {
      if (category === 'themes') {
        missions = ["L'odeur du métro le matin", "Une déclaration d'amour à un kebab", "La tragédie de la chaussette orpheline"];
      } else if (category === 'structures') {
        missions = [{ label: "Quatrain", lines: 4 }, { label: "Tercet", lines: 3 }];
      } else if (category === 'syllables') {
        missions = ["Alexandrins (12 pieds)", "Octosyllabes (8 pieds)", "Vers Libres"];
      } else if (category === 'rhymes') {
        missions = ["Suivies (AABB)", "Croisées (ABAB)", "Embrassées (ABBA)", "Libres"];
      }
    }

    // Sauvegarde immédiate pour écraser les vieilles données corrompues
    if (missions && missions.length > 0) {
      await kv.set(redisKey, missions);
    }
  }

  return NextResponse.json({ missions: missions || [] });
}

export async function POST(request: Request) {
  try {
    const { gameId, category, missions } = await request.json();
    
    let redisKey = `missions:${gameId}`;
    if (gameId === 'poet' && category) {
      redisKey = `poet:${category}`;
    }

    await kv.set(redisKey, missions);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur POST" }, { status: 500 });
  }
}