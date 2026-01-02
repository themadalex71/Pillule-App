export type PlayerId = "Joueur A" | "Joueur B";

export type GameResult = {
  gameId: string; // "zoom" | "meme" | ...
  label?: string; // titre affichable
  status: "completed" | "aborted";
  resultsByPlayer: Record<PlayerId, {
    score: number;
    detail?: string;
    meta?: any;
  }>;
};
