import {
  Code,
  Database,
  FileText,
  FlaskConical,
  Gauge,
  GitCommitHorizontal,
  GraduationCap,
  Languages,
  ListChecks,
  Megaphone,
  PenLine,
  Sparkles,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react";
import type { Prompt } from "./types";

export type Tone = { chip: string; tile: string };

const tones: Tone[] = [
  {
    chip: "bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
    tile: "bg-blue-50 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
  },
  {
    chip: "bg-pink-50 text-pink-600 dark:bg-pink-400/15 dark:text-pink-300",
    tile: "bg-pink-50 text-pink-500 dark:bg-pink-400/15 dark:text-pink-300",
  },
  {
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  {
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
    tile: "bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
  },
  {
    chip: "bg-violet-50 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
    tile: "bg-violet-50 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
  },
  {
    chip: "bg-teal-50 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
    tile: "bg-teal-50 text-teal-600 dark:bg-teal-400/15 dark:text-teal-300",
  },
  {
    chip: "bg-orange-50 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
    tile: "bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300",
  },
  {
    chip: "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
    tile: "bg-indigo-50 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300",
  },
];

const [blue, pink, green, amber, violet, teal, orange, indigo] = tones;

const knownTagTones: Record<string, Tone> = {
  development: blue,
  code: blue,
  review: blue,
  backend: green,
  marketing: green,
  design: pink,
  frontend: pink,
  productivity: amber,
  sql: amber,
  performance: orange,
  git: orange,
  testing: teal,
  react: teal,
  learning: violet,
  writing: indigo,
};

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function tagTone(tag: string): Tone {
  return knownTagTones[tag] ?? tones[hash(tag) % tones.length];
}

type IconRule = { words: string[]; icon: LucideIcon; tone: Tone };

const iconRules: IconRule[] = [
  { words: ["debug", "debugging", "bug", "error", "stack", "code", "refactor"], icon: Code, tone: indigo },
  { words: ["design", "ui", "ux", "figma", "layout"], icon: PenLine, tone: pink },
  { words: ["marketing", "email", "campaign", "launch", "social"], icon: Megaphone, tone: green },
  { words: ["productivity", "roadmap", "plan", "planning", "todo", "milestone"], icon: ListChecks, tone: blue },
  { words: ["react", "frontend", "component", "terminal", "shell", "cli"], icon: SquareTerminal, tone: teal },
  { words: ["sql", "database", "query", "postgres", "db"], icon: Database, tone: amber },
  { words: ["test", "tests", "testing", "qa"], icon: FlaskConical, tone: teal },
  { words: ["git", "commit", "diff", "pr"], icon: GitCommitHorizontal, tone: orange },
  { words: ["learning", "explain", "teach", "newcomer"], icon: GraduationCap, tone: violet },
  { words: ["performance", "optimize", "speed", "slow"], icon: Gauge, tone: orange },
  { words: ["translate", "translation", "i18n", "language"], icon: Languages, tone: blue },
  { words: ["writing", "write", "summary", "summarize", "docs", "notes"], icon: FileText, tone: indigo },
];

export function promptIcon(prompt: Prompt): { icon: LucideIcon; tone: Tone } {
  const words = [...prompt.tags, ...prompt.title.toLowerCase().split(/[^\p{L}\p{N}]+/u)];
  for (const rule of iconRules) {
    if (words.some((w) => rule.words.includes(w))) return { icon: rule.icon, tone: rule.tone };
  }
  return { icon: Sparkles, tone: violet };
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function updatedAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (Math.abs(seconds) < 60) return "Updated just now";
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return `Updated ${relative.format(Math.round(seconds / size), unit)}`;
  }
  return "Updated just now";
}
