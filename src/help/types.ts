/** Shapes of the compiled help index (written by scripts/build-help-index.mjs) */

export type HelpInline =
  | string
  | { t: 'b' | 'i'; c: HelpInline[] }
  | { code: string }
  | { a: string; c: HelpInline[] }
  | { img: string; alt: string };

export type HelpBlock =
  | { t: 'h'; level: number; id: string; c: HelpInline[] }
  | { t: 'p'; c: HelpInline[] }
  | { t: 'ol' | 'ul'; start?: number; items: HelpInline[][] }
  | { t: 'quote'; kind: 'tip' | 'warning' | 'note'; c: HelpBlock[] }
  | { t: 'table'; head: HelpInline[][]; rows: HelpInline[][][] }
  | { t: 'img'; shot: string; alt: string }
  | { t: 'hr' }
  | { t: 'code'; text: string };

export interface HelpTopic {
  id: string;
  title: string;
  category: string;
  order: number;
  /** App paths the topic documents: "/pos", "/admin/inventory", "/admin/inventory?tab=transfers" */
  routes: string[];
  keywords: string[];
  related: string[];
  /** Readable without signing in (login, sign-up...) */
  public?: boolean;
  summary?: string;
  headings: string[];
  shots: string[];
  /** Plain text of the body (search) */
  text: string;
  blocks: HelpBlock[];
  /** Language the topic is shown in (differs from the app language when it fell back) */
  lang?: string;
}

export interface HelpIndex {
  lang: string;
  topics: HelpTopic[];
}
