import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

const DEFAULT_ALIASES: Record<string, string[]> = {
    "Champignon": ["champignon", "morille", "cèpe", "girolle", "bolet", "pleurote", "shiitake", "truffe"],
    "Pâtes": ["pâtes", "spaghetti", "penne", "tagliatelle", "coquillette", "fusilli", "farfalle", "macaroni", "lasagne"],
    "Oignon": ["oignon", "échalote", "oignon rouge", "oignon nouveau", "ciboule"],
    "Ail": ["ail", "gousse d'ail"],
    "Poulet": ["poulet", "blanc de poulet", "cuisse de poulet", "aile de poulet", "volaille"],
    "Boeuf": ["boeuf", "steak", "entrecôte", "bavette", "rumsteak", "viande hachée"],
    "Porc": ["porc", "filet mignon", "côte de porc", "échine", "travers"],
    "Jambon": ["jambon", "jambon blanc", "jambon cru", "prosciutto", "serrano"],
    "Salade": ["salade", "laitue", "mâche", "roquette", "batavia"],
    "Crème fraîche": ["crème", "crème fraîche", "crème liquide", "crème entière"],
    "Sucre": ["sucre", "cassonade", "sucre glace", "sucre roux", "sirop d'agave"],
    "Pomme de terre": ["pomme de terre", "patate", "grenaille"]
};

export async function GET() {
  try {
    const saved = await kv.get('aliases_config');
    // On fusionne les sauvegardes avec les défauts pour être sûr de tout avoir
    return NextResponse.json(saved || DEFAULT_ALIASES);
  } catch (error) {
    return NextResponse.json(DEFAULT_ALIASES);
  }
}