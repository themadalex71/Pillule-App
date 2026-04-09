// features/cuisine/types.ts

export interface IngredientItem {
    quantity: string;
    name: string;
}

export interface Recipe {
    id: string;
    title: string;
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: (IngredientItem | string)[]; 
    steps: string[];
    addedBy: string;
    image?: string;
}

export interface Category {
    name: string;
    items: string[];
    subcategories?: {
        name: string;
        items: string[];
    }[];
}

export const INITIAL_CATEGORIES: Category[] = [
    { name: "🥦 Légumes & Fruits", items: ["Tomate", "Oignon", "Ail", "Pomme de terre", "Carotte", "Courgette", "Poivron", "Champignon", "Épinard", "Haricot vert", "Brocoli", "Chou-fleur", "Concombre", "Avocat", "Citron", "Salade"] },
    { name: "🥩 Viandes & Poissons", items: ["Poulet", "Boeuf", "Porc", "Jambon", "Lardon", "Saucisse", "Dinde", "Canard", "Thon", "Saumon", "Crevette", "Cabillaud", "Sardine"] },
    { name: "🧀 Crèmerie & Oeufs", items: ["Oeuf", "Lait", "Beurre", "Crème fraîche", "Yaourt", "Fromage râpé", "Mozzarella", "Parmesan", "Chèvre", "Feta", "Cheddar"] },
    { name: "🍝 Féculents & Base", items: ["Pâtes", "Riz", "Semoule", "Pain", "Farine", "Maïzena", "Lentilles", "Pois chiches", "Haricots rouges", "Pâte feuilletée", "Pâte brisée"] },
    { name: "🥫 Épicerie & Assaisonnement", items: ["Huile d'olive", "Vinaigre", "Sauce soja", "Moutarde", "Mayonnaise", "Ketchup", "Coulis de tomate", "Lait de coco", "Miel", "Sucre", "Chocolat", "Levure", "Noix", "Amandes"] }
];
