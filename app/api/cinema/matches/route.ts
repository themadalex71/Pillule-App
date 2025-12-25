import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const redis = Redis.fromEnv();

  try {
    // 1. On récupère les deux listes "A voir" (Wishlist)
    const alexList = await redis.get<any[]>('user_Alex_wishlist') || [];
    const jujuList = await redis.get<any[]>('user_Juju_wishlist') || [];

    // 2. On cherche l'intersection (les films présents des deux côtés)
    // On garde ceux de la liste d'Alex qui existent aussi dans la liste de Juju
    const matches = alexList.filter((movieAlex) => 
        jujuList.some((movieJuju) => movieJuju.id === movieAlex.id)
    );

    return NextResponse.json(matches);

  } catch (error) {
    console.error("Erreur matches:", error);
    return NextResponse.json([], { status: 500 });
  }
}