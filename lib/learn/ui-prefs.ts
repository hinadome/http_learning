const PREFS_KEY = "http-learning-checker-ui-prefs";

export type UiMode = "lab" | "workspace";

export interface UiPrefs {
  accordionOpen: Record<string, boolean>;
  curriculumId?: string;
  activePresetId?: string | null;
  /** Lab = focused request loop; Workspace = client + intercept tools. */
  uiMode?: UiMode;
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

export function setUiMode(mode: UiMode): void {
  const prefs = loadUiPrefs();
  prefs.uiMode = mode;
  saveUiPrefs(prefs);
}
