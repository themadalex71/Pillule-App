import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

type PlayerId = "Joueur A" | "Joueur B";

// -----------------------------
// ZOOM (état + résultat)
// -----------------------------
type ZoomResult = {
  winner: PlayerId | null; // gagnant = devineur (si validé), sinon null
  isValid: boolean;
  ts: number;
};

const KEY_ZOOM_IMAGE = "zoom_current_image";
const KEY_ZOOM_AUTHOR = "zoom_current_author";
const KEY_ZOOM_GUESS = "zoom_current_guess";
const KEY_ZOOM_RESULT = "zoom_last_result";

// -----------------------------
// MEME (turns + votes)
// -----------------------------
type MemeTurn = {
  type: "meme";
  player: PlayerId;
  memes: Array<{
    url: string;
    zones: any[];
    inputs: Record<string, string>;
    instanceId: string;
  }>;
  submittedAt: number;
};

type MemeTurnsMap = Record<PlayerId, MemeTurn>;

const KEY_MEME_TURNS = "meme_turns_session";
const KEY_MEME_VOTES_GIVEN = "meme_votes_given"; // { "Joueur A": scoreDonnéParA, "Joueur B": scoreDonnéParB }

// Legacy cleanup
const LEGACY_MEME_TURNS = "meme_current_turns";
const LEGACY_MEME_VOTES = "meme_votes_session";

function opponentOf(p: PlayerId): PlayerId {
  return p === "Joueur A" ? "Joueur B" : "Joueur A";
}

export async function GET() {
  try {
    // -------------------
    // ZOOM
    // -------------------
    const zoomImage = await kv.get<string>(KEY_ZOOM_IMAGE);
    const zoomAuthor = await kv.get<string>(KEY_ZOOM_AUTHOR);
    const zoomGuess = await kv.get<string>(KEY_ZOOM_GUESS);
    const zoomResult = await kv.get<ZoomResult>(KEY_ZOOM_RESULT);

    const zoom = {
      hasPendingGame: Boolean(zoomImage && zoomAuthor),
      image: zoomImage || null,
      author: zoomAuthor || null,
      currentGuess: zoomGuess || null,
      result: zoomResult || null,
    };

    // -------------------
    // MEME
    // -------------------
    const turnsMap = (await kv.get<MemeTurnsMap>(KEY_MEME_TURNS)) || ({} as MemeTurnsMap);
    const turns = Object.values(turnsMap);

    const votesGiven = (await kv.get<Record<string, number>>(KEY_MEME_VOTES_GIVEN)) || {};

    // votesReceived = score REÇU par chaque joueur (donc vote de l'adversaire)
    const votesReceived: Record<PlayerId, number> = {} as any;
    (["Joueur A", "Joueur B"] as PlayerId[]).forEach((p) => {
      const opp = opponentOf(p);
      const received = votesGiven[opp];
      if (received !== undefined) (votesReceived as any)[p] = received;
    });

    return NextResponse.json({
      zoom,
      memes: turns,
      votes: votesReceived,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur GET" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // -------------------
    // ZOOM - création de partie
    // -------------------
    if (body?.type === "zoom") {
      const { image, author } = body;

      if (!image || !author) {
        return NextResponse.json({ error: "Zoom: image/author manquants" }, { status: 400 });
      }

      await kv.set(KEY_ZOOM_IMAGE, image);
      await kv.set(KEY_ZOOM_AUTHOR, author);
      await kv.del(KEY_ZOOM_GUESS);

      return NextResponse.json({ success: true });
    }

    // -------------------
    // ZOOM - soumission d'un guess
    // -------------------
    if (body?.action === "submit_guess") {
      const { guess } = body;
      if (!guess) {
        return NextResponse.json({ error: "Zoom: guess manquant" }, { status: 400 });
      }
      await kv.set(KEY_ZOOM_GUESS, guess);
      return NextResponse.json({ success: true });
    }

    // -------------------
    // ZOOM - validation (seul l'auteur valide)
    // -------------------
    if (body?.action === "zoom_validate") {
      const { isValid, validator } = body;

      const author = (await kv.get<PlayerId>(KEY_ZOOM_AUTHOR)) || null;
      const guess = await kv.get<string>(KEY_ZOOM_GUESS);

      if (!author || !guess) {
        return NextResponse.json({ error: "Zoom: aucune partie à valider" }, { status: 400 });
      }
      if (validator !== author) {
        return NextResponse.json({ error: "Zoom: seul l'auteur peut valider" }, { status: 403 });
      }

      const winner: PlayerId | null = isValid ? opponentOf(author) : null;

      await kv.set(
        KEY_ZOOM_RESULT,
        { winner, isValid: Boolean(isValid), ts: Date.now() } satisfies ZoomResult,
        { ex: 300 }
      );

      await kv.del(KEY_ZOOM_IMAGE);
      await kv.del(KEY_ZOOM_AUTHOR);
      await kv.del(KEY_ZOOM_GUESS);

      return NextResponse.json({ success: true });
    }

    // -------------------
    // MEME - soumission des memes d'un joueur
    // -------------------
    if (body?.type === "meme") {
      const { player, memes } = body;

      if (!player || !Array.isArray(memes)) {
        return NextResponse.json({ error: "Meme: player/memes invalides" }, { status: 400 });
      }

      const turnsMap = (await kv.get<MemeTurnsMap>(KEY_MEME_TURNS)) || ({} as MemeTurnsMap);
      (turnsMap as any)[player] = {
        type: "meme",
        player,
        memes,
        submittedAt: Date.now(),
      } satisfies MemeTurn;

      await kv.set(KEY_MEME_TURNS, turnsMap);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action POST non reconnue" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur POST" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { voter, score } = await req.json();

    if (!voter || typeof score !== "number") {
      return NextResponse.json({ error: "PATCH: voter/score invalides" }, { status: 400 });
    }

    const votesGiven = (await kv.get<Record<string, number>>(KEY_MEME_VOTES_GIVEN)) || {};
    votesGiven[voter] = score;

    await kv.set(KEY_MEME_VOTES_GIVEN, votesGiven);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur PATCH" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const game = url.searchParams.get("game");

    if (game === "zoom") {
      await kv.del(KEY_ZOOM_IMAGE);
      await kv.del(KEY_ZOOM_AUTHOR);
      await kv.del(KEY_ZOOM_GUESS);
      await kv.del(KEY_ZOOM_RESULT);
      return NextResponse.json({ success: true });
    }

    if (game === "meme") {
      await kv.del(KEY_MEME_TURNS);
      await kv.del(KEY_MEME_VOTES_GIVEN);

      await kv.del(LEGACY_MEME_TURNS);
      await kv.del(LEGACY_MEME_VOTES);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "DELETE: game manquant ou inconnu" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur DELETE" }, { status: 500 });
  }
}
