import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getDailySeed } from "@/features/daily/services/dailyGameLogic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserHouseholdRecord = {
  householdId?: string | null;
};

type HouseholdDocument = {
  memberIds?: string[];
};

type DailyMode = "daily" | "simu";
type ZoomPoint = { x: number; y: number };

const ZOOM_MIN_PERCENT = 8;
const ZOOM_MAX_PERCENT = 92;

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

  const db = getFirebaseAdminDb();
  const userSnapshot = await db.collection("users").doc(uid).get();

  if (!userSnapshot.exists) {
    return {
      uid,
      householdId: `solo:${uid}`,
    };
  }

  const userRecord = userSnapshot.data() as UserHouseholdRecord;

  if (!userRecord.householdId) {
    return {
      uid,
      householdId: `solo:${uid}`,
    };
  }

  const householdSnapshot = await db.collection("households").doc(userRecord.householdId).get();

  if (!householdSnapshot.exists) {
    return {
      uid,
      householdId: `solo:${uid}`,
    };
  }

  const household = householdSnapshot.data() as HouseholdDocument;
  const memberIds = Array.isArray(household.memberIds) ? household.memberIds : [];

  if (!memberIds.includes(uid)) {
    throw new Error("Acces refuse a ce foyer.");
  }

  return {
    uid,
    householdId: householdSnapshot.id,
  };
}

function weeklyScoresKey(householdId: string) {
  return `weekly_scores_current:${householdId}`;
}

function normalizeMode(value: unknown): DailyMode {
  return value === "simu" ? "simu" : "daily";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseZoomPoint(raw: unknown): ZoomPoint {
  if (!raw || typeof raw !== "object") {
    return { x: 50, y: 50 };
  }

  const source = raw as { x?: unknown; y?: unknown };
  const x = typeof source.x === "number" ? source.x : 50;
  const y = typeof source.y === "number" ? source.y : 50;

  return {
    x: Math.round(clamp(x, ZOOM_MIN_PERCENT, ZOOM_MAX_PERCENT) * 10) / 10,
    y: Math.round(clamp(y, ZOOM_MIN_PERCENT, ZOOM_MAX_PERCENT) * 10) / 10,
  };
}

function getSessionKey(mode: DailyMode, dateKey: string, householdId: string) {
  if (mode === "simu") {
    return `daily_session:simu:${householdId}`;
  }

  return `daily_session:${dateKey}:${householdId}`;
}

function getParticipantIds(session: any): string[] {
  const idsFromParticipants = Array.isArray(session?.participants)
    ? session.participants
        .map((participant: any) => participant?.id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (idsFromParticipants.length > 0) {
    return idsFromParticipants;
  }

  return Object.keys(session?.players || {}).filter((id) => Boolean(id));
}

function getRingTarget(participantIds: string[], playerId: string) {
  if (participantIds.length === 0) return null;

  const index = participantIds.indexOf(playerId);
  if (index === -1) return participantIds[0];

  return participantIds[(index + 1) % participantIds.length];
}

async function addScore(
  session: any,
  householdId: string,
  playerId: string,
  points: number,
  shouldUpdateWeekly: boolean,
) {
  if (!session.players[playerId]) {
    session.players[playerId] = { score: 0 };
  }

  session.players[playerId].score += points;
  if (shouldUpdateWeekly) {
    await kv.hincrby(weeklyScoresKey(householdId), playerId, points);
  }
}

async function getNewRandomMeme(excludeIds: number[]) {
  const allMemes = (await kv.get<any[]>("missions:meme")) || [];

  if (allMemes.length === 0) {
    return null;
  }

  const pool = allMemes.filter((m) => !excludeIds.includes(m.id));
  const source = pool.length > 0 ? pool : allMemes;
  return source[Math.floor(Math.random() * source.length)];
}

function applyTierListScores(session: any) {
  if (session.sharedData?.resultsApplied) {
    return [] as Array<{ playerId: string; score: number }>;
  }

  const participantIds = getParticipantIds(session);
  const results: Array<{ playerId: string; score: number }> = [];

  participantIds.forEach((playerId) => {
    const playerData = session.sharedData?.players?.[playerId];
    if (!playerData) return;

    const targetId = playerData.targetId || getRingTarget(participantIds, playerId);
    const targetData = targetId ? session.sharedData?.players?.[targetId] : null;

    const guessOrder = Array.isArray(playerData.guessOrder) ? playerData.guessOrder : [];
    const realOrder = Array.isArray(targetData?.realOrder) ? targetData.realOrder : [];

    let score = 0;
    guessOrder.forEach((id: any, index: number) => {
      if (realOrder[index] && String(id) === String(realOrder[index])) {
        score += 1;
      }
    });

    results.push({ playerId, score });
  });

  session.sharedData.resultsApplied = true;
  return results;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sharedData, status, mode: modeFromBody, ...payload } = body;
    const mode = normalizeMode(modeFromBody);

    const context = await getDailyContext(request);
    const playerId = context.uid;
    const shouldUpdateWeekly = mode === "daily";

    const sessionKey = getSessionKey(mode, getDailySeed(), context.householdId);
    const session: any = await kv.get(sessionKey);

    if (!session) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    const participantIds = getParticipantIds(session);
    if (!participantIds.includes(playerId)) {
      return NextResponse.json({ error: "Acces refuse a cette session." }, { status: 403 });
    }

    if (sharedData) {
      session.sharedData = {
        ...session.sharedData,
        ...sharedData,
      };

      if (status) {
        session.status = status;

        if (session.game?.id === "tierlist" && status === "finished") {
          const scores = applyTierListScores(session);
          for (const scoreEntry of scores) {
            await addScore(session, context.householdId, scoreEntry.playerId, scoreEntry.score, shouldUpdateWeekly);
          }
        }
      }

      await kv.set(sessionKey, session);
      return NextResponse.json({ success: true, session });
    }

    if (action === "start_game") {
      session.status = "in_progress";
      await kv.set(sessionKey, session);
      return NextResponse.json({ success: true, session });
    }

    if (session.game?.id === "zoom") {
      const isMultiPhotoFlow = Boolean(session.sharedData?.challengesByPlayer);

      if (isMultiPhotoFlow) {
        const zoomData = session.sharedData;
        const challengesByPlayer = zoomData.challengesByPlayer || {};
        const targetByPlayer = zoomData.targetByPlayer || {};
        const sourceByPlayer =
          zoomData.sourceByPlayer ||
          Object.fromEntries(
            participantIds
              .map((id) => {
                const targetId = targetByPlayer[id];
                return targetId ? [targetId, id] : null;
              })
              .filter(Boolean) as Array<[string, string]>,
          );

        if (!zoomData.submittedPhotosByPlayer) {
          zoomData.submittedPhotosByPlayer = Object.fromEntries(participantIds.map((id) => [id, false]));
        }
        if (!zoomData.submittedGuessesByPlayer) {
          zoomData.submittedGuessesByPlayer = Object.fromEntries(participantIds.map((id) => [id, false]));
        }
        if (!zoomData.submittedValidationsByPlayer) {
          zoomData.submittedValidationsByPlayer = Object.fromEntries(participantIds.map((id) => [id, false]));
        }

        if (action === "zoom_submit_photo") {
          const myChallenge = challengesByPlayer[playerId];
          if (!myChallenge) {
            return NextResponse.json({ error: "Defi photo introuvable pour ce joueur." }, { status: 400 });
          }

          myChallenge.image = payload.image;
          myChallenge.zoom = parseZoomPoint(payload.zoom);
          zoomData.submittedPhotosByPlayer[playerId] = true;

          const everyoneSubmitted = participantIds.every(
            (id) => Boolean(zoomData.submittedPhotosByPlayer[id]) && Boolean(challengesByPlayer[id]?.image),
          );
          if (everyoneSubmitted) {
            zoomData.phase = "GUESS";
          }
        }

        if (action === "zoom_submit_guess") {
          const sourceId = sourceByPlayer[playerId];
          const incomingChallenge = sourceId ? challengesByPlayer[sourceId] : null;
          const guess = String(payload.guess || "").trim();

          if (!incomingChallenge || !incomingChallenge.image) {
            return NextResponse.json({ error: "La photo a deviner n'est pas encore disponible." }, { status: 400 });
          }

          if (!guess) {
            return NextResponse.json({ error: "La proposition ne peut pas etre vide." }, { status: 400 });
          }

          incomingChallenge.guess = guess;
          zoomData.submittedGuessesByPlayer[playerId] = true;

          const everyoneGuessed = participantIds.every((id) => Boolean(zoomData.submittedGuessesByPlayer[id]));
          if (everyoneGuessed) {
            zoomData.phase = "VALIDATION";
          }
        }

        if (action === "zoom_validate") {
          const myChallenge = challengesByPlayer[playerId];
          if (!myChallenge || !myChallenge.guess) {
            return NextResponse.json({ error: "Aucune proposition a valider pour ce joueur." }, { status: 400 });
          }

          myChallenge.isValid = Boolean(payload.isValid);
          zoomData.submittedValidationsByPlayer[playerId] = true;

          const everyoneValidated = participantIds.every((id) => Boolean(zoomData.submittedValidationsByPlayer[id]));
          if (everyoneValidated) {
            zoomData.phase = "RESULTS";
            if (!zoomData.resultsApplied) {
              for (const authorId of participantIds) {
                const challenge = challengesByPlayer[authorId];
                if (challenge?.isValid === true && challenge?.targetId) {
                  await addScore(session, context.householdId, challenge.targetId, 1, shouldUpdateWeekly);
                }
              }
              zoomData.resultsApplied = true;
            }
            session.status = "finished";
          }
        }

        await kv.set(sessionKey, session);
        return NextResponse.json({ success: true, session });
      }

      // Legacy fallback for already-created old Zoom sessions.
      if (action === "zoom_submit_photo") {
        session.sharedData.image = payload.image;
        session.sharedData.zoom = parseZoomPoint(payload.zoom);
        session.sharedData.step = "GUESS";
        session.sharedData.currentGuess = null;
        session.sharedData.guessIndex = 0;
        session.sharedData.currentGuesserId = session.sharedData.guessOrder?.[0] || null;
      }

      if (action === "zoom_submit_guess") {
        if (session.sharedData.currentGuesserId !== playerId) {
          return NextResponse.json({ error: "Ce n'est pas ton tour de deviner." }, { status: 400 });
        }

        session.sharedData.currentGuess = payload.guess;
        session.sharedData.step = "VALIDATION";
      }

      if (action === "zoom_validate") {
        const isValid = Boolean(payload.isValid);
        const currentGuesserId = session.sharedData.currentGuesserId;

        if (isValid && currentGuesserId) {
          if (!session.sharedData.resultsApplied) {
            await addScore(session, context.householdId, currentGuesserId, 1, shouldUpdateWeekly);
            session.sharedData.resultsApplied = true;
          }
          session.status = "finished";
        } else {
          const nextIndex = Number(session.sharedData.guessIndex || 0) + 1;
          const nextGuesserId = session.sharedData.guessOrder?.[nextIndex] || null;

          if (!nextGuesserId) {
            session.sharedData.resultsApplied = true;
            session.status = "finished";
          } else {
            session.sharedData.currentGuess = null;
            session.sharedData.guessIndex = nextIndex;
            session.sharedData.currentGuesserId = nextGuesserId;
            session.sharedData.step = "GUESS";
          }
        }
      }

      await kv.set(sessionKey, session);
      return NextResponse.json({ success: true, session });
    }

    if (session.game?.id === "meme") {
      if (action === "meme_reroll") {
        const memeIndex = Number(payload.memeIndex);
        const playerData = session.sharedData.players?.[playerId];

        if (!playerData) {
          return NextResponse.json({ error: "Joueur introuvable." }, { status: 400 });
        }

        if (playerData.rerolls?.[memeIndex] > 0) {
          const usedIds = Object.entries(session.sharedData.players || {}).flatMap(([id, data]: [string, any]) => {
            const memes = Array.isArray(data?.memes) ? data.memes : [];
            return memes
              .map((meme: any, index: number) => (id === playerId && index === memeIndex ? null : meme?.id))
              .filter(Boolean) as number[];
          });

          const newMeme = await getNewRandomMeme(usedIds);
          if (newMeme) {
            playerData.memes[memeIndex] = newMeme;
            playerData.rerolls[memeIndex] -= 1;
            playerData.inputs[memeIndex] = {};
            if (!Array.isArray(playerData.zoneOverrides)) {
              playerData.zoneOverrides = [];
            }
            playerData.zoneOverrides[memeIndex] = {};
            if (!Array.isArray(playerData.extraZones)) {
              playerData.extraZones = [];
            }
            playerData.extraZones[memeIndex] = [];
          }
        }
      }

      if (action === "meme_submit_creation") {
        const inputs = payload.inputs;
        const zoneOverrides = Array.isArray(payload.zoneOverrides) ? payload.zoneOverrides : [];
        const extraZones = Array.isArray(payload.extraZones) ? payload.extraZones : [];
        const playerData = session.sharedData.players?.[playerId];

        if (!playerData) {
          return NextResponse.json({ error: "Joueur introuvable." }, { status: 400 });
        }

        playerData.inputs = inputs;
        playerData.zoneOverrides = zoneOverrides;
        playerData.extraZones = extraZones;
        playerData.finished = true;

        const everyoneFinished = participantIds.every((id) => session.sharedData.players?.[id]?.finished);
        if (everyoneFinished) {
          session.sharedData.phase = "VOTE";
        }
      }

      if (action === "meme_submit_vote") {
        const votes = Array.isArray(payload.votes) ? payload.votes : [];
        const targetId = session.sharedData.targetByPlayer?.[playerId] || getRingTarget(participantIds, playerId);

        if (!session.sharedData.votesByPlayer) {
          session.sharedData.votesByPlayer = Object.fromEntries(participantIds.map((id) => [id, null]));
        }

        session.sharedData.votesByPlayer[playerId] = votes;

        if (targetId && session.sharedData.players?.[targetId]) {
          session.sharedData.players[targetId].votesReceived = votes;
        }

        const everyoneVoted = participantIds.every((id) => Array.isArray(session.sharedData.votesByPlayer?.[id]));

        if (everyoneVoted) {
          session.sharedData.phase = "RESULTS";
          session.status = "finished";

          if (!session.sharedData.resultsApplied) {
            for (const id of participantIds) {
              const votesReceived = session.sharedData.players?.[id]?.votesReceived || [];
              const score = votesReceived.reduce((sum: number, value: number) => sum + Number(value || 0), 0);
              await addScore(session, context.householdId, id, score, shouldUpdateWeekly);
            }
            session.sharedData.resultsApplied = true;
          }
        }
      }

      await kv.set(sessionKey, session);
      return NextResponse.json({ success: true, session });
    }

    if (session.game?.id === "cadavre") {
      if (action === "cadavre_submit_step") {
        const text = String(payload.text || "");
        const currentStep = Number(session.sharedData.phase);
        const totalSteps = session.sharedData.template?.steps?.length || 0;

        const storyToEdit = (session.sharedData.stories || []).find(
          (story: any) => story.authors?.[currentStep] === playerId && story.parts?.[currentStep] === null,
        );

        if (storyToEdit) {
          storyToEdit.parts[currentStep] = text;
        }

        const stepComplete = (session.sharedData.stories || []).every((story: any) => story.parts?.[currentStep] !== null);
        if (stepComplete) {
          session.sharedData.phase += 1;
          if (session.sharedData.phase >= totalSteps) {
            session.sharedData.phase = "VOTE";
          }
        }
      }

      if (action === "cadavre_vote") {
        const score = Number(payload.score || 1);

        if (!session.sharedData.votes[playerId]) {
          session.sharedData.votes[playerId] = [];
        }

        session.sharedData.votes[playerId].push(score);

        const everyoneVoted = participantIds.every((id) => (session.sharedData.votes?.[id] || []).length > 0);
        if (everyoneVoted) {
          session.sharedData.phase = "RESULTS";
          session.status = "finished";

          if (!session.sharedData.resultsApplied) {
            for (const id of participantIds) {
              await addScore(session, context.householdId, id, 1, shouldUpdateWeekly);
            }
            session.sharedData.resultsApplied = true;
          }
        }
      }

      await kv.set(sessionKey, session);
      return NextResponse.json({ success: true, session });
    }

    if (session.game?.id === "poet") {
      if (action === "poet_submit") {
        const text = String(payload.text || "");
        session.sharedData.poems[playerId] = text;

        const everyoneSubmitted = participantIds.every((id) => Boolean(session.sharedData.poems?.[id]));
        if (everyoneSubmitted) {
          session.sharedData.phase = "VOTE";
        }
      }

      if (action === "poet_vote") {
        const score = Number(payload.score || 0);
        const targetId = session.sharedData.targetByPlayer?.[playerId] || getRingTarget(participantIds, playerId);

        if (!session.sharedData.votesByPlayer) {
          session.sharedData.votesByPlayer = Object.fromEntries(participantIds.map((id) => [id, null]));
        }

        session.sharedData.votesByPlayer[playerId] = score;

        if (targetId) {
          if (!session.sharedData.votes[targetId]) {
            session.sharedData.votes[targetId] = [];
          }
          session.sharedData.votes[targetId].push(score);
        }

        const everyoneVoted = participantIds.every((id) => session.sharedData.votesByPlayer?.[id] !== null);
        if (everyoneVoted) {
          session.sharedData.phase = "RESULTS";
          session.status = "finished";

          if (!session.sharedData.resultsApplied) {
            for (const id of participantIds) {
              const receivedVotes = session.sharedData.votes?.[id] || [];
              const total = receivedVotes.reduce((sum: number, value: number) => sum + Number(value || 0), 0);
              await addScore(session, context.householdId, id, total, shouldUpdateWeekly);
            }
            session.sharedData.resultsApplied = true;
          }
        }
      }

      await kv.set(sessionKey, session);
      return NextResponse.json({ success: true, session });
    }

    await kv.set(sessionKey, session);
    return NextResponse.json({ success: true, session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Action";
    const status = message === "Non autorise." ? 401 : message === "Acces refuse a ce foyer." ? 403 : 500;

    console.error("Erreur Action:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
