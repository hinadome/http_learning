const PREFS_KEY = "http-learning-checker-ui-prefs";

export interface UiPrefs {
  accordionOpen: Record<string, boolean>;
  curriculumId?: string;
  activePresetId?: string | null;
}

export function loadUiPrefs(): UiPrefs {
  if (typeof window === "undefined") return { accordionOpen: {} };
  try {
    return {
      accordionOpen: {},
      ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"),
    };
  } catch {
    return { accordionOpen: {} };
  }
}

export function saveUiPrefs(prefs: UiPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function setAccordionOpen(id: string, open: boolean): void {
  const prefs = loadUiPrefs();
  prefs.accordionOpen = { ...prefs.accordionOpen, [id]: open };
  saveUiPrefs(prefs);
}
