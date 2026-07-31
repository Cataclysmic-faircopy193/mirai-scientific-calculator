import { themes, type Language } from "prism-react-renderer"

export type CodeLanguage = "shell" | "ts" | "tsx"

export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  shell: "Shell",
  ts: "TypeScript",
  tsx: "TSX",
}

export const PRISM_LANGUAGES: Record<CodeLanguage, Language> = {
  shell: "bash",
  ts: "typescript",
  tsx: "tsx",
}

export const CODE_THEME = themes.vsDark
