import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { meme, score, author } = await req.json();

    const archivedMeme = {
      ...meme,
      finalScore: score,
      author: author,
      archivedAt: new Date().toISOString(),
    };

    // On ajoute le meme à une liste globale "meme:archive"
    await kv.lpush('meme:archive', JSON.stringify(archivedMeme));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur archive" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const archive = await kv.lrange('meme:archive', 0, -1);
    const parsed = archive.map(m => typeof m === 'string' ? JSON.parse(m) : m);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json([]);
  }
}