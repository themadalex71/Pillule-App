import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { GAMES_LIST, getDailySeed } from '@/lib/dailyGameLogic';

export const dynamic = "force-dynamic";

// --- TEMPLATES PAR DÉFAUT (BACKUP) ---
// Ce sont exactement ceux que tu m'as donnés.
const DEFAULT_CADAVRE_TEMPLATES = [
  {
    id: "classique",
    title: "La Phrase Complexe",
    steps: [
      { label: "Un Groupe Nominal (Sujet)", placeholder: "Ex: Le vieux grille-pain, Une saucisse masquée..." },
      { label: "Un Adjectif (qui s'accorde)", placeholder: "Ex: poilu, dépressive, fluorescent..." },
      { label: "Un Verbe d'action (transitif)", placeholder: "Ex: dévore, chatouille, pulvérise..." },
      { label: "Un Adverbe (Manière)", placeholder: "Ex: violemment, tendrement, illégalement..." },
      { label: "Un Complément d'Objet (COD)", placeholder: "Ex: un inspecteur des impôts, la Tour Eiffel..." },
      { label: "Un Complément de Lieu", placeholder: "Ex: dans la baignoire, sur la lune..." }
    ]
  },
  {
    id: "condition",
    title: "Le Si... Alors...",
    steps: [
      { label: "Si... (Sujet)", placeholder: "Ex: Si un lama unijambiste..." },
      { label: "Verbe (Imparfait)", placeholder: "Ex: mangeait, pilotait, insultait..." },
      { label: "Complément (Quoi/Qui ?)", placeholder: "Ex: une raclette, son patron..." },
      { label: "Alors... (Nouveau Sujet)", placeholder: "Ex: alors le pape, alors ma belle-mère..." },
      { label: "Verbe (Conditionnel)", placeholder: "Ex: exploserait, vomirait, danserait..." },
      { label: "Conclusion", placeholder: "Ex: avec joie, pour toujours..." }
    ]
  },
  {
    id: "relative",
    title: "Celui qui...",
    steps: [
      { label: "Quelqu'un ou quelque chose", placeholder: "Ex: Un dictateur, Une crotte de nez..." },
      { label: "Qui... (Action 1)", placeholder: "Ex: qui vole des bonbons..." },
      { label: "Et qui... (Action 2)", placeholder: "Ex: et qui se frotte contre les murs..." },
      { label: "A rencontré...", placeholder: "Ex: a rencontré Batman, a vu une loutre..." },
      { label: "Pour lui donner...", placeholder: "Ex: pour lui donner un bisou, une gifle..." },
      { label: "Conséquence", placeholder: "Ex: et c'était gênant, et ils se marièrent..." }
    ]
  },
  {
    id: "comparaison",
    title: "La Comparaison Absurde",
    steps: [
      { label: "Sujet 1", placeholder: "Ex: Ton pied gauche, Le président..." },
      { label: "Est beaucoup plus... (Adjectif)", placeholder: "Ex: est beaucoup plus gluant, intelligent..." },
      { label: "Que... (Sujet 2)", placeholder: "Ex: qu'un parpaing, que ma dignité..." },
      { label: "Parce qu'il...", placeholder: "Ex: parce qu'il sent le fromage..." },
      { label: "Quand il...", placeholder: "Ex: quand il dort, quand il cuisine..." },
      { label: "Avec...", placeholder: "Ex: avec une cuillère, avec passion..." }
    ]
  }
];

// --- HELPER MEME MAKER ---
function getRandomMemes(allMemes: any[], count: number, excludeIds: number[] = []) {
  const pool = allMemes.filter(m => !excludeIds.includes(m.id));
  const source = pool.length < count ? allMemes : pool;
  if (source.length === 0) return [];
  const shuffled = [...source].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateKey = getDailySeed();
  const sessionKey = `daily_session:${dateKey}`;
  const forceReset = searchParams.get('forceReset') === 'true';

  try {
    if (forceReset) await kv.del(sessionKey);

    let session: any = await kv.get(sessionKey);

    // Si pas de session, on en crée une nouvelle
    if (!session) {
      // 1. CHOIX DU JEU
      const game = GAMES_LIST[Math.floor(Math.random() * GAMES_LIST.length)];
      
      let sharedData = {};

      // --- INITIALISATION ZOOM ---
      if (game.id === 'zoom') {
        let missionsPool = await kv.get<string[]>('missions:zoom') || [];
        if (missionsPool.length === 0) {
           missionsPool = ["Un objet en bois", "Un truc qui brille", "Quelque chose de bleu"];
        }
        const mission = missionsPool[Math.floor(Math.random() * missionsPool.length)];
        const lastAuthor = await kv.get('zoom_last_author');
        const author = lastAuthor === 'Moi' ? 'Chéri(e)' : 'Moi';
        
        sharedData = {
          step: 'PHOTO',
          mission: mission,
          author: author,
          guesser: author === 'Moi' ? 'Chéri(e)' : 'Moi',
          image: null,
          currentGuess: null
        };
      } 
      
      // --- INITIALISATION MEME ---
      else if (game.id === 'meme') {
        let allMemes = await kv.get<any[]>('missions:meme') || [];
        // Fallback fake data si vide pour éviter crash
        if (allMemes.length === 0) {
          allMemes = [
             { id: 1, name: "Exemple 1", url: "https://i.imgflip.com/1ur9b0.jpg", zones: [{id:1, top:10, left:10, width:40, height:20, fontSize:20, color:'#fff'}] },
             { id: 2, name: "Exemple 2", url: "https://i.imgflip.com/261o3j.jpg", zones: [{id:1, top:10, left:10, width:40, height:20, fontSize:20, color:'#fff'}] }
          ];
        }
        const memesMoi = getRandomMemes(allMemes, 2);
        const memesCherie = getRandomMemes(allMemes, 2, memesMoi.map(m => m.id));

        sharedData = {
          phase: 'CREATION',
          players: {
            "Moi": { memes: memesMoi, rerolls: [2, 2], inputs: [{}, {}], finished: false, votesReceived: [] },
            "Chéri(e)": { memes: memesCherie, rerolls: [2, 2], inputs: [{}, {}], finished: false, votesReceived: [] }
          }
        };
      } 
      
      // --- INITIALISATION CADAVRE (MODIFIÉ) ---
      else if (game.id === 'cadavre') {
        // 1. On cherche les templates en base
        let templates = await kv.get<any[]>('missions:cadavre') || [];
        
        // 2. Si vide, on utilise les templates par défaut (ton code)
        if (templates.length === 0) {
            templates = DEFAULT_CADAVRE_TEMPLATES;
        }

        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        const emptyParts = new Array(randomTemplate.steps.length).fill(null);
        
        // Alternance des auteurs
        const authorsA = emptyParts.map((_, i) => i % 2 === 0 ? "Moi" : "Chéri(e)");
        const authorsB = emptyParts.map((_, i) => i % 2 === 0 ? "Chéri(e)" : "Moi");

        sharedData = {
          phase: 0,
          template: randomTemplate,
          stories: [
            { id: 'A', parts: [...emptyParts], authors: authorsA },
            { id: 'B', parts: [...emptyParts], authors: authorsB }
          ],
          votes: { "Moi": [], "Chéri(e)": [] }
        };
      }

      // --- INITIALISATION POÈTE DU DIMANCHE (MIX & MATCH) ---
      else if (game.id === 'poet') {
        // 1. Récupération des 4 catégories séparées
        const themes = await kv.get<string[]>('poet:themes') || ["Le Fromage", "L'Amour", "Le Métro"];
        const structures = await kv.get<any[]>('poet:structures') || [{ label: "Quatrain", lines: 4 }, { label: "Tercet", lines: 3 }];
        const syllables = await kv.get<string[]>('poet:syllables') || ["Alexandrins", "Vers Libres", "Octosyllabes"];
        const rhymes = await kv.get<string[]>('poet:rhymes') || ["Croisées (ABAB)", "Libres", "Suivies (AABB)"];

        // 2. Tirage aléatoire indépendant pour chaque catégorie
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];
        const randomStructure = structures[Math.floor(Math.random() * structures.length)];
        const randomSyllable = syllables[Math.floor(Math.random() * syllables.length)];
        const randomRhyme = rhymes[Math.floor(Math.random() * rhymes.length)];

        sharedData = {
          phase: 'WRITE', // WRITE -> VOTE -> RESULTS
          constraints: {
            theme: randomTheme,
            structure: randomStructure, // { label, lines }
            syllable: randomSyllable,
            rhyme: randomRhyme
          },
          poems: {
            "Moi": null,
            "Chéri(e)": null
          },
          votes: { "Moi": [], "Chéri(e)": [] }
        };
      }

      session = {
        date: dateKey,
        game: game,
        status: 'in_progress',
        sharedData,
        players: { "Moi": { score: 0 }, "Chéri(e)": { score: 0 } }
      };

      await kv.set(sessionKey, session, { ex: 86400 });
    }

    const weeklyRanking = await kv.hgetall(`weekly_scores_current`) || {};
    return NextResponse.json({ ...session, weeklyRanking });

  } catch (error) {
    console.error("Init Error:", error);
    return NextResponse.json({ error: "Erreur Serveur" }, { status: 500 });
  }
}