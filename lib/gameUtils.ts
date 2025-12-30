// Ajoute cette structure pour définir le contenu de chaque jour
export const GAMES_CATALOG = [
  { 
    id: 'zoom', 
    title: 'Zoom Extrême', 
    description: 'Devine l\'objet pris en photo de très très près !',
    // 👇 LE NOUVEAU CONTENU EST ICI
    data: {
      zoomImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop', // Une texture rouge (Chaussure Nike)
      fullImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop',
      answer: 'Une Chaussure',
      clue: 'On en porte deux.'
    }
  },
  // ... laisse les autres jeux comme avant pour l'instant ...
  { id: 'meme', title: 'Meme Maker', description: 'Trouve la légende...' },
  { id: 'cadavre', title: 'Cadavre Exquis', description: 'Complète la phrase...' },
  { id: 'poete', title: 'Poète du Dimanche', description: 'Fais une rime...' },
  { id: 'bd', title: 'Bulle de BD', description: 'Remplis la bulle vide !' },
  { id: 'tierlist', title: 'Le Clash du Jour', description: 'Classe ces éléments...' },
  { id: 'mix', title: 'Le Grand Mix', description: 'Une énigme rapide.' },
  { id: 'couple', title: 'Ni Ange Ni Démon', description: 'Question vérité couple !' }
];

export const MEME_TEMPLATES = []
  

export function getGameOfTheDay(dateString: string) {
  // ... (ton code existant ne change pas) ...
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GAMES_CATALOG.length;
  return GAMES_CATALOG[index];
}

export function getGameById(id: string) {
  return GAMES_CATALOG.find(game => game.id === id) || GAMES_CATALOG[0];
}

async function getMissions() {
  const defaultMissions = ["Un truc doux", "Un truc en bois"]; // Ta liste actuelle
  const res = await fetch('/api/content?gameId=zoom');
  const customMissions = await res.json();
  
  return [...defaultMissions, ...customMissions];
}

export function getAllGames() {
  return GAMES_CATALOG;
}
