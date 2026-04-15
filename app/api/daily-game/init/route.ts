import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";
import { GAMES_LIST, getDailySeed } from "@/features/daily/services/dailyGameLogic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DailyParticipant = {
  id: string;
  name: string;
};

type HouseholdMember = {
  uid: string;
  email?: string;
  displayName?: string;
};

type HouseholdDocument = {
  memberIds?: string[];
  members?: HouseholdMember[];
};

type UserHouseholdRecord = {
  householdId?: string | null;
};

type DailyMode = "daily" | "simu";

const GRAMMAR_TEMPLATES = [
  {
    id: "classique",
    title: "La Phrase Complexe",
    steps: [
      { label: "Un Groupe Nominal (Sujet)", placeholder: "Ex: Le vieux grille-pain, Une saucisse masquee..." },
      { label: "Un Adjectif (qui s'accorde)", placeholder: "Ex: poilu, depressive, fluorescent..." },
      { label: "Un Verbe d'action (transitif)", placeholder: "Ex: devore, chatouille, pulverise..." },
      { label: "Un Adverbe (Maniere)", placeholder: "Ex: violemment, tendrement, illegalement..." },
      { label: "Un Complement d'Objet (COD)", placeholder: "Ex: un inspecteur des impots, la Tour Eiffel..." },
      { label: "Un Complement de Lieu", placeholder: "Ex: dans la baignoire, sur la lune..." },
    ],
  },
  {
    id: "condition",
    title: "Le Si... Alors...",
    steps: [
      { label: "Si... (Sujet)", placeholder: "Ex: Si un lama unijambiste..." },
      { label: "Verbe (Imparfait)", placeholder: "Ex: mangeait, pilotait, insultait..." },
      { label: "Complement (Quoi/Qui ?)", placeholder: "Ex: une raclette, son patron..." },
      { label: "Alors... (Nouveau Sujet)", placeholder: "Ex: alors le pape, alors ma belle-mere..." },
      { label: "Verbe (Conditionnel)", placeholder: "Ex: exploserait, vomirait, danserait..." },
      { label: "Conclusion", placeholder: "Ex: avec joie, pour toujours..." },
    ],
  },
  {
    id: "relative",
    title: "Celui qui...",
    steps: [
      { label: "Quelqu'un ou quelque chose", placeholder: "Ex: Un dictateur, Une crotte de nez..." },
      { label: "Qui... (Action 1)", placeholder: "Ex: qui vole des bonbons..." },
      { label: "Et qui... (Action 2)", placeholder: "Ex: et qui se frotte contre les murs..." },
      { label: "A rencontre...", placeholder: "Ex: a rencontre Batman, a vu une loutre..." },
      { label: "Pour lui donner...", placeholder: "Ex: pour lui donner un bisou, une gifle..." },
      { label: "Consequence", placeholder: "Ex: et c'etait genant, et ils se marierent..." },
    ],
  },
  {
    id: "comparaison",
    title: "La Comparaison Absurde",
    steps: [
      { label: "Sujet 1", placeholder: "Ex: Ton pied gauche, Le president..." },
      { label: "Est beaucoup plus... (Adjectif)", placeholder: "Ex: est beaucoup plus gluant, intelligent..." },
      { label: "Que... (Sujet 2)", placeholder: "Ex: qu'un parpaing, que ma dignite..." },
      { label: "Parce qu'il...", placeholder: "Ex: parce qu'il sent le fromage..." },
      { label: "Quand il...", placeholder: "Ex: quand il dort, quand il cuisine..." },
      { label: "Avec...", placeholder: "Ex: avec une cuillere, avec passion..." },
    ],
  },
];

const DEFAULT_TIER_LIST = [
  {
    id: "demo_fruit",
    title: "Les Meilleurs Fruits",
    items: [
      { id: 1, label: "Pomme", url: "https://upload.wikimedia.org/wikipedia/commons/1/15/Red_Apple.jpg" },
      { id: 2, label: "Banane", url: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Banana-Single.jpg" },
      { id: 3, label: "Fraise", url: "https://upload.wikimedia.org/wikipedia/commons/2/29/PerfectStrawberry.jpg" },
      { id: 4, label: "Kiwi", url: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Kiwi_%28Actinidia_chinensis%29_1_Luc_Viatour.jpg" },
      { id: 5, label: "Orange", url: "https://upload.wikimedia.org/wikipedia/commons/c/c4/Orange-Fruit-Pieces.jpg" },
    ],
  },
];

function getAuthTokenFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new Error("Non autorise.");
  }

  return token;
}

async function getDailyContext(request: Request) {
  const token = getAuthTokenFromRequest(request);
  const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
  const uid = decoded.uid;
  const fallbackName = (decoded.name as string | undefined) || decoded.email || "Utilisateur";

  const db = getFirebaseAdminDb();
  const userSnapshot = await db.collection("users").doc(uid).get();

  if (!userSnapshot.exists) {
    return {
      uid,
      householdId: `solo:${uid}`,
      hasHousehold: false,
      participants: [{ id: uid, name: fallbackName }],
    };
  }

  const userRecord = userSnapshot.data() as UserHouseholdRecord;

  if (!userRecord.householdId) {
    return {
      uid,
      householdId: `solo:${uid}`,
      hasHousehold: false,
      participants: [{ id: uid, name: fallbackName }],
    };
  }

  const householdSnapshot = await db.collection("households").doc(userRecord.householdId).get();

  if (!householdSnapshot.exists) {
    return {
      uid,
      householdId: `solo:${uid}`,
      hasHousehold: false,
      participants: [{ id: uid, name: fallbackName }],
    };
  }

  const household = householdSnapshot.data() as HouseholdDocument;
  const memberIds = Array.from(new Set(Array.isArray(household.memberIds) ? household.memberIds : [])).filter(Boolean);

  if (!memberIds.includes(uid)) {
    throw new Error("Acces refuse a ce foyer.");
  }

  const memberNameMap = new Map<string, string>();
  (household.members || []).forEach((member) => {
    if (!member?.uid) return;
    memberNameMap.set(member.uid, member.displayName || member.email || `Membre ${member.uid.slice(0, 6)}`);
  });

  const participants = memberIds.map((memberId) => ({
    id: memberId,
    name: memberNameMap.get(memberId) || (memberId === uid ? fallbackName : `Membre ${memberId.slice(0, 6)}`),
  }));

  return {
    uid,
    householdId: householdSnapshot.id,
    hasHousehold: true,
    participants,
  };
}

function buildRingTargets(participantIds: string[]) {
  const targets: Record<string, string> = {};

  if (participantIds.length === 0) {
    return targets;
  }

  participantIds.forEach((id, index) => {
    targets[id] = participantIds[(index + 1) % participantIds.length];
  });

  return targets;
}

function normalizeMemeId(id: unknown) {
  if (id === null || id === undefined) return "";
  return String(id);
}

function getRandomMemes(allMemes: any[], count: number, excludeIds: string[] = []) {
  const excludedSet = new Set(excludeIds.map((id) => normalizeMemeId(id)).filter(Boolean));
  const pool = allMemes.filter((m) => !excludedSet.has(normalizeMemeId(m?.id)));
  const source = pool.length < count ? allMemes : pool;
  const shuffled = [...source].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function toWeeklyRanking(raw: Record<string, any>, participants: DailyParticipant[]) {
  const nameMap = new Map(participants.map((participant) => [participant.id, participant.name]));

  return Object.entries(raw || {})
    .map(([id, score]) => ({
      id,
      name: nameMap.get(id) || `Membre ${id.slice(0, 6)}`,
      score: Number(score || 0),
    }))
    .sort((a, b) => b.score - a.score);
}

function weeklyScoresKey(householdId: string) {
  return `weekly_scores_current:${householdId}`;
}

function normalizeMode(value: string | null): DailyMode {
  return value === "simu" ? "simu" : "daily";
}

function getRequestedGameId(value: string | null) {
  if (!value) return null;
  return GAMES_LIST.some((game) => game.id === value) ? value : null;
}

function getSessionKey(mode: DailyMode, dateKey: string, householdId: string) {
  if (mode === "simu") {
    return `daily_session:simu:${householdId}`;
  }

  return `daily_session:${dateKey}:${householdId}`;
}

function getSessionTtl(mode: DailyMode) {
  return mode === "simu" ? 86400 * 7 : 86400;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateKey = getDailySeed();
  const forceReset = searchParams.get("forceReset") === "true";
  const mode = normalizeMode(searchParams.get("mode"));
  const requestedGameId = mode === "simu" ? getRequestedGameId(searchParams.get("gameId")) : null;

  try {
    const context = await getDailyContext(request);
    const sessionKey = getSessionKey(mode, dateKey, context.householdId);

    if (forceReset) {
      await kv.del(sessionKey);
    }

    let session: any = await kv.get(sessionKey);

    if (
      mode === "simu" &&
      requestedGameId &&
      session &&
      session.game?.id &&
      session.game.id !== requestedGameId
    ) {
      await kv.del(sessionKey);
      session = null;
    }

    if (!session) {
      if (context.participants.length < 2) {
        const weeklyRaw = (await kv.hgetall(weeklyScoresKey(context.householdId))) || {};
        const weeklyRanking = toWeeklyRanking(weeklyRaw as Record<string, any>, context.participants);

        return NextResponse.json({
          date: dateKey,
          householdId: context.householdId,
          mode,
          status: "waiting_players",
          participants: context.participants,
          game: null,
          sharedData: {
            message:
              mode === "simu"
                ? "Ajoute au moins un autre membre au foyer pour lancer une simulation."
                : "Ajoute au moins un autre membre au foyer pour lancer le Defi du Jour.",
          },
          players: Object.fromEntries(context.participants.map((participant) => [participant.id, { score: 0 }])),
          weeklyRanking: mode === "daily" ? weeklyRanking : [],
        });
      }

      const participantIds = context.participants.map((participant) => participant.id);
      const game =
        (requestedGameId && GAMES_LIST.find((candidate) => candidate.id === requestedGameId)) ||
        GAMES_LIST[Math.floor(Math.random() * GAMES_LIST.length)];
      const ringTargets = buildRingTargets(participantIds);
      let sharedData: Record<string, any> = {};

      if (game.id === "zoom") {
        let missionsPool = (await kv.get<string[]>("missions:zoom")) || [];
        if (missionsPool.length === 0) {
          missionsPool = ["Un objet en bois", "Un truc qui brille", "Quelque chose de bleu"];
        }

        const sourceByPlayer: Record<string, string> = {};
        participantIds.forEach((authorId) => {
          const targetId = ringTargets[authorId];
          if (targetId) {
            sourceByPlayer[targetId] = authorId;
          }
        });

        const challengesByPlayer = Object.fromEntries(
          participantIds.map((authorId) => [
            authorId,
            {
              targetId: ringTargets[authorId],
              mission: missionsPool[Math.floor(Math.random() * missionsPool.length)],
              image: null,
              zoom: null,
              guess: null,
              isValid: null,
            },
          ]),
        );

        sharedData = {
          phase: "PHOTO",
          targetByPlayer: ringTargets,
          sourceByPlayer,
          challengesByPlayer,
          submittedPhotosByPlayer: Object.fromEntries(participantIds.map((id) => [id, false])),
          submittedGuessesByPlayer: Object.fromEntries(participantIds.map((id) => [id, false])),
          submittedValidationsByPlayer: Object.fromEntries(participantIds.map((id) => [id, false])),
          resultsApplied: false,
        };
      } else if (game.id === "meme") {
        let allMemes = (await kv.get<any[]>("missions:meme")) || [];
        if (allMemes.length === 0) {
          allMemes = [
            {
              id: 1,
              name: "Exemple 1",
              url: "https://i.imgflip.com/1ur9b0.jpg",
              zones: [{ id: 1, top: 10, left: 10, width: 40, height: 20, fontSize: 20, color: "#fff", fontFamily: "Impact, Arial Black, sans-serif" }],
            },
            {
              id: 2,
              name: "Exemple 2",
              url: "https://i.imgflip.com/261o3j.jpg",
              zones: [{ id: 1, top: 10, left: 10, width: 40, height: 20, fontSize: 20, color: "#fff", fontFamily: "Impact, Arial Black, sans-serif" }],
            },
          ];
        }

        const playersData: Record<string, any> = {};
        let usedIds: string[] = [];

        participantIds.forEach((participantId) => {
          const memes = getRandomMemes(allMemes, 2, usedIds);
          usedIds = [...usedIds, ...memes.map((m) => normalizeMemeId(m?.id)).filter(Boolean)];

          playersData[participantId] = {
            memes,
            rerolls: [2, 2],
            inputs: [{}, {}],
            zoneOverrides: [{}, {}],
            extraZones: [[], []],
            finished: false,
            votesReceived: [],
          };
        });

        sharedData = {
          phase: "CREATION",
          targetByPlayer: ringTargets,
          votesByPlayer: Object.fromEntries(participantIds.map((id) => [id, null])),
          players: playersData,
          resultsApplied: false,
        };
      } else if (game.id === "cadavre") {
        const randomTemplate = GRAMMAR_TEMPLATES[Math.floor(Math.random() * GRAMMAR_TEMPLATES.length)];
        const emptyParts = new Array(randomTemplate.steps.length).fill(null);

        const stories = participantIds.map((_, storyIndex) => ({
          id: `S${storyIndex + 1}`,
          parts: [...emptyParts],
          authors: emptyParts.map((__, stepIndex) => participantIds[(storyIndex + stepIndex) % participantIds.length]),
        }));

        sharedData = {
          phase: 0,
          template: randomTemplate,
          stories,
          votes: Object.fromEntries(participantIds.map((id) => [id, []])),
          resultsApplied: false,
        };
      } else if (game.id === "poet") {
        const themes = (await kv.get<string[]>("poet:themes")) || ["Le Fromage", "L'Amour", "Le Metro"];
        const structures = (await kv.get<any[]>("poet:structures")) || [{ label: "Quatrain", lines: 4 }, { label: "Tercet", lines: 3 }];
        const syllables = (await kv.get<string[]>("poet:syllables")) || ["Alexandrins", "Vers Libres", "Octosyllabes"];
        const rhymes = (await kv.get<string[]>("poet:rhymes")) || ["Croisees (ABAB)", "Libres", "Suivies (AABB)"];

        sharedData = {
          phase: "WRITE",
          constraints: {
            theme: themes[Math.floor(Math.random() * themes.length)],
            structure: structures[Math.floor(Math.random() * structures.length)],
            syllable: syllables[Math.floor(Math.random() * syllables.length)],
            rhyme: rhymes[Math.floor(Math.random() * rhymes.length)],
          },
          targetByPlayer: ringTargets,
          poems: Object.fromEntries(participantIds.map((id) => [id, null])),
          votesByPlayer: Object.fromEntries(participantIds.map((id) => [id, null])),
          votes: Object.fromEntries(participantIds.map((id) => [id, []])),
          resultsApplied: false,
        };
      } else if (game.id === "tierlist") {
        let missionsPool = (await kv.get<any[]>("missions:tierlist")) || [];
        if (missionsPool.length === 0) {
          missionsPool = DEFAULT_TIER_LIST;
        }

        const mission = missionsPool[Math.floor(Math.random() * missionsPool.length)];
        const shuffledItems = [...mission.items].sort(() => 0.5 - Math.random());

        sharedData = {
          phase: "INPUT",
          mission: {
            ...mission,
            initialItems: shuffledItems,
          },
          players: Object.fromEntries(
            participantIds.map((id) => [
              id,
              {
                realOrder: null,
                guessOrder: null,
                targetId: ringTargets[id],
                finished: false,
              },
            ]),
          ),
          resultsApplied: false,
        };
      }

      session = {
        sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        date: dateKey,
        householdId: context.householdId,
        mode,
        participants: context.participants,
        game,
        status: "in_progress",
        sharedData,
        players: Object.fromEntries(participantIds.map((id) => [id, { score: 0 }])),
      };

      await kv.set(sessionKey, session, { ex: getSessionTtl(mode) });
    }

    const weeklyRaw = mode === "daily" ? (await kv.hgetall(weeklyScoresKey(context.householdId))) || {} : {};
    const weeklyRanking =
      mode === "daily"
        ? toWeeklyRanking(weeklyRaw as Record<string, any>, session.participants || context.participants)
        : [];

    return NextResponse.json({
      ...session,
      mode,
      currentUserId: context.uid,
      weeklyRanking,
      hasHousehold: context.hasHousehold,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Serveur";
    const status = message === "Non autorise." ? 401 : message === "Acces refuse a ce foyer." ? 403 : 500;

    console.error("Init Error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
