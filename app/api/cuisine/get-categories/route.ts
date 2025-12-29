import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

// Les catégories par défaut (si c'est la première fois qu'on lance l'appli)
const DEFAULT_CATEGORIES = [
    {
        name: "🥦 Légumes & Fruits",
        items: ["Tomate", "Oignon", "Ail", "Pomme de terre", "Carotte", "Courgette", "Poivron", "Champignon", "Épinard", "Haricot vert", "Brocoli", "Chou-fleur", "Concombre", "Avocat", "Citron", "Salade"]
    },
    {
        name: "🥩 Viandes & Poissons",
        items: ["Poulet", "Boeuf", "Porc", "Jambon", "Lardon", "Saucisse", "Dinde", "Canard", "Thon", "Saumon", "Crevette", "Cabillaud", "Sardine"]
    },
    {
        name: "🧀 Crèmerie & Oeufs",
        items: ["Oeuf", "Lait", "Beurre", "Crème fraîche", "Yaourt", "Fromage râpé", "Mozzarella", "Parmesan", "Chèvre", "Feta", "Cheddar"]
    },
    {
        name: "🍝 Féculents & Base",
        items: ["Pâtes", "Riz", "Semoule", "Pain", "Farine", "Maïzena", "Lentilles", "Pois chiches", "Haricots rouges", "Pâte feuilletée", "Pâte brisée"]
    },
    {
        name: "🥫 Épicerie & Assaisonnement",
        items: ["Huile d'olive", "Vinaigre", "Sauce soja", "Moutarde", "Mayonnaise", "Ketchup", "Coulis de tomate", "Lait de coco", "Miel", "Sucre", "Chocolat", "Levure", "Noix", "Amandes"]
    }
];

export async function GET() {
  try {
    // On essaie de récupérer la liste personnalisée dans Redis
    const savedCategories = await kv.get('cuistot:categories_config');
    
    // Si on a trouvé quelque chose, on le renvoie, sinon on renvoie la liste par défaut
    return NextResponse.json(savedCategories || DEFAULT_CATEGORIES);

  } catch (error) {
    console.error("Erreur récup catégories:", error);
    // En cas d'erreur, on ne bloque pas, on renvoie les défauts
    return NextResponse.json(DEFAULT_CATEGORIES);
  }
}