import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

type MemeTurn = {
  type: 'meme';
  player: string; // "Joueur A" | "Joueur B"
  memes: Array<{
    url: string;
    zones: any[];
    inputs: Record<string, string>;
    instanceId: string;
  }>;
  submittedAt: number;
};

type MemeTurnsMap = Record<string, MemeTurn>; // key = player

// Stockage clair (nouveau)
const KEY_MEME_TURNS = 'meme_turns_session';
const KEY_MEME_VOTES_GIVEN = 'meme_votes_given'; // { "Joueur A": scoreGivenByA, "Joueur B": scoreGivenByB }

// Anciennes clés (legacy) : on les efface au DELETE pour éviter les états "fantômes"
const LEGACY_MEME_TURNS = 'meme_current_turns';
const LEGACY_MEME_VOTES = 'meme_votes_session';

function getOpponent(player: string) {
  return player === 'Joueur A' ? 'Joueur B' : 'Joueur A';
}

export async function GET() {
  try {
    // -------------------
    // ZOOM
    // -------------------
    const zoomImage = await kv.get<string>('zoom_current_image');
    const zoomAuthor = await kv.get<string>('zoom_current_author');
    const zoomGuess = await kv.get<string>('zoom_current_guess');

    const zoom = {
      image: zoomImage || null,
      author: zoomAuthor || null,
      currentGuess: zoomGuess || null,
      hasPendingGame: Boolean(zoomImage && zoomAuthor),
    };

    // -------------------
    // MEME MAKER
    // -------------------
    const turnsMap = (await kv.get<MemeTurnsMap>(KEY_MEME_TURNS)) || {};
    const turns = Object.values(turnsMap || {});

    // votesGiven = score donné par le votant (ex: "Joueur A": 10 => A a donné 10 points à B)
    const votesGiven =
      (await kv.get<Record<string, number>>(KEY_MEME_VOTES_GIVEN)) || {};

    // votesReceived = score REÇU par chaque joueur (ce que l'autre lui a donné)
    const votesReceived: Record<string, number> = {};
    for (const player of ['Joueur A', 'Joueur B']) {
      const opponent = getOpponent(player);
      const received = votesGiven[opponent];
      if (received !== undefined) votesReceived[player] = received;
    }

    return NextResponse.json({
      zoom,
      memes: turns,
      votes: votesReceived,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur GET' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // -------------------
    // ZOOM - création de partie
    // -------------------
    if (body?.type === 'zoom') {
      const { image, author } = body;

      if (!image || !author) {
        return NextResponse.json(
          { error: 'Zoom: image/author manquants' },
          { status: 400 }
        );
      }

      await kv.set('zoom_current_image', image);
      await kv.set('zoom_current_author', author);
      await kv.del('zoom_current_guess');

      return NextResponse.json({ success: true });
    }

    // -------------------
    // ZOOM - soumission de guess
    // -------------------
    if (body?.action === 'submit_guess') {
      const { guess } = body;
      if (!guess) {
        return NextResponse.json(
          { error: 'Zoom: guess manquant' },
          { status: 400 }
        );
      }
      await kv.set('zoom_current_guess', guess);
      return NextResponse.json({ success: true });
    }

    // -------------------
    // MEME - soumission des memes d’un joueur
    // -------------------
    if (body?.type === 'meme') {
      const { player, memes } = body;

      if (!player || !Array.isArray(memes)) {
        return NextResponse.json(
          { error: 'Meme: player/memes invalides' },
          { status: 400 }
        );
      }

      const turnsMap = (await kv.get<MemeTurnsMap>(KEY_MEME_TURNS)) || {};
      turnsMap[player] = {
        type: 'meme',
        player,
        memes,
        submittedAt: Date.now(),
      };

      await kv.set(KEY_MEME_TURNS, turnsMap);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Action POST non reconnue' },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur POST' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    // PATCH = vote final d’un joueur : { voter, score }
    // - voter = "Joueur A" => A donne un score à B
    // - score = total points donnés
    const { voter, score } = await req.json();

    if (!voter || typeof score !== 'number') {
      return NextResponse.json(
        { error: 'PATCH: voter/score invalides' },
        { status: 400 }
      );
    }

    const votesGiven =
      (await kv.get<Record<string, number>>(KEY_MEME_VOTES_GIVEN)) || {};
    votesGiven[voter] = score;

    await kv.set(KEY_MEME_VOTES_GIVEN, votesGiven);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur PATCH' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const game = url.searchParams.get('game');

    if (game === 'zoom') {
      await kv.del('zoom_current_image');
      await kv.del('zoom_current_author');
      await kv.del('zoom_current_guess');
      return NextResponse.json({ success: true });
    }

    if (game === 'meme') {
      await kv.del(KEY_MEME_TURNS);
      await kv.del(KEY_MEME_VOTES_GIVEN);

      // cleanup legacy
      await kv.del(LEGACY_MEME_TURNS);
      await kv.del(LEGACY_MEME_VOTES);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'DELETE: game manquant ou inconnu' },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur DELETE' }, { status: 500 });
  }
}
