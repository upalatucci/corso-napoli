export const STORAGE_PREFIX = "contadaimoku-napoli";

export const CAMPAIGN = {
  daimokuGoalMinutes: 1_000_000,
  daimokuDisplayGoal: 50_000_000,
  shakubukuGoal: 3_000,
  invitiGoal: 300,
  gohonzonGoal: 20,
  nationalMembersGoal: 2_000,
  deadlineLabel: "8 novembre 2026",
  courseDates: "6 · 7 · 8 novembre 2026",
};

export const CONVERSATION_TIPS = [
  {
    title: "Pensa a qualcuno",
    text:
      "Non a un numero, ma a una persona concreta. Recita Daimoku per la sua felicità e cerca il momento giusto per parlarle.",
  },
  {
    title: "Parti da ciò che vivi",
    text:
      "Non devi sapere spiegare tutto. Racconta, con parole tue, cosa significa la pratica nella tua vita e cosa ti sta aiutando a trasformare.",
  },
  {
    title: "Lascia tempo",
    text:
      "Un dialogo sincero ha già valore. Non tutti sono pronti nello stesso momento: niente fretta, niente pressione. La relazione viene prima del risultato.",
  },
  {
    title: "Se nasce curiosità",
    text:
      "Puoi proporre semplicemente di venire a un incontro, per conoscere la pratica e ascoltare altre esperienze.",
  },
] as const;

export const DAIMOKU_PER_MINUTE = 50;

export const TRACKS = {
  daimoku: { label: "Daimoku", short: "Daimoku", unit: "minuti" },
  shakubuku: { label: "Shakubuku", short: "Shakubuku", unit: "Shakubuku" },
  super: { label: "Inviti a un meeting", short: "Inviti", unit: "inviti" },
} as const;

export type TrackKind = keyof typeof TRACKS;
