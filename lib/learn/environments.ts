import type { Environment, EnvVariable } from "../types";

const STORAGE_KEY = "http-learning-checker-environments";
const ACTIVE_KEY = "http-learning-checker-active-env";

let varId = 0;
export function newEnvVarId(): string {
  return `ev-${++varId}`;
}

export function newEnvId(): string {
  return `env-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_ENV: Environment = {
  id: "default",
  name: "Default",
  variables: [
    {
      id: newEnvVarId(),
      key: "baseUrl",
      value: "https://httpbin.org",
      enabled: true,
    },
  ],
};

export function loadEnvironments(): Environment[] {
  if (typeof window === "undefined") return [DEFAULT_ENV];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [DEFAULT_ENV];
    const parsed = JSON.parse(raw) as Environment[];
    return parsed.length ? parsed : [DEFAULT_ENV];
  } catch {
    return [DEFAULT_ENV];
  }
}

export function saveEnvironments(envs: Environment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envs));
}

export function loadActiveEnvId(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(ACTIVE_KEY) || "default";
}

export function saveActiveEnvId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveEnvironment(envs: Environment[]): Environment {
  const id = loadActiveEnvId();
  return envs.find((e) => e.id === id) ?? envs[0] ?? DEFAULT_ENV;
}

export function createEmptyVariable(): EnvVariable {
  return { id: newEnvVarId(), key: "", value: "", enabled: true };
}
