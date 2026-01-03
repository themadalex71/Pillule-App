// lib/dailyGameLogic.ts

// 🎯 LISTE DES MISSIONS POUR LE ZOOM EXTRÊME
const ZOOM_MISSIONS = [
  "Un truc tout doux",
  "Un truc qui gratte",
  "Quelque chose en bois",
  "Quelque chose en métal",
  "Un tissu avec des motifs",
  "Une matière plastique",
  "Un truc transparent (verre, eau...)",
  "Un truc rugueux ou abîmé",
  "Un objet tout rouge",
  "Un objet tout bleu",
  "Un objet noir",
  "Un truc multicolore",
  "Quelque chose de jaune",
  "Un truc qui se mange",
  "Un truc qui se boit",
  "Un objet de la salle de bain",
  "Un truc qui traîne sur ton bureau",
  "Un vêtement que tu portes",
  "Un truc qui s'allume",
  "Une plante ou une fleur",
  "Un truc qui sent fort",
  "Un morceau de ta main",
  "Un morceau de ton visage",
  "Ta peau (de très près)",
  "Tes cheveux ou poils",
  "Un truc rond",
  "Un truc avec des écritures",
  "Un truc sale ou poussiéreux",
  "Ton objet préféré",
  "Le truc le plus moche de la pièce"
];

// 🎮 LISTE GLOBALE DES JEUX DISPONIBLES
export const GAMES_LIST = [
  { 
    id: 'zoom', 
    title: 'Zoom Extrême', 
    description: "Devine l'objet pris en photo de très très près !",
    emoji: '🔍',
    color: 'bg-purple-500',
    type: 'asynchronous' 
  },
  { 
    id: 'meme', 
    title: 'Meme Maker', 
    description: "Légende une image drôle le plus efficacement possible.",
    emoji: '🎭',
    color: 'bg-blue-500',
    type: 'simultaneous' 
  },
  {
    id: 'cadavre',
    title: 'Cadavre Exquis',
    description: "Chacun écrit une suite sans voir le début.",
    emoji: '✍️',
    color: 'bg-green-500',
    type: 'sequential' 
  },
  {
    id: 'poet',
    title: 'Poète du Dimanche',
    description: "Des rimes riches pour des idées pauvres.",
    emoji: '🪶',
    color: 'bg-pink-500',
    type: 'simultaneous'
  }
];

// 📅 GÉNÉRATEUR DE SEED QUOTIDIENNE
export function getDailySeed() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // Retourne "YYYY-MM-DD"
}

// 🎲 LOGIQUE DE SÉLECTION DE MISSION ZOOM
export function getRandomZoomMission() {
  const randomIndex = Math.floor(Math.random() * ZOOM_MISSIONS.length);
  return ZOOM_MISSIONS[randomIndex];
}