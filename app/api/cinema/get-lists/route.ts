import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const redis = Redis.fromEnv();
  const { searchParams } = new URL(request.url);
  
  const type = searchParams.get('type');   // 'wishlist' ou 'history'
  const userId = searchParams.get('userId'); // 'Alex' ou 'Juju'

  if (!userId || !type) {
      return NextResponse.json([]);
  }

  // On reconstruit la clé pour trouver la bonne boîte
  const key = `user_${userId}_${type === 'wishlist' ? 'wishlist' : 'history'}`;

  try {
    const list = await redis.get(key) || [];
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}