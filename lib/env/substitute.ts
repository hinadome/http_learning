import type { ComposedRequest } from "../types";

/** Replace {{var}} placeholders using enabled environment variables. */
export function substituteVariables(
  text: string,
  vars: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] !== undefined ? vars[key] : `{{${key}}}`
  );
}

export function envToMap(
  variables: Array<{ key: string; value: string; enabled: boolean }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of variables) {
    if (v.enabled && v.key.trim()) map[v.key.trim()] = v.value;
  }
  return map;
}

export function applyEnvironment(
  req: ComposedRequest,
  vars: Record<string, string>
): ComposedRequest {
  if (Object.keys(vars).length === 0) return req;
  return {
    ...req,
    url: substituteVariables(req.url, vars),
    headerText: substituteVariables(req.headerText, vars),
    body: substituteVariables(req.body, vars),
    graphqlVariables: req.graphqlVariables
      ? substituteVariables(req.graphqlVariables, vars)
      : req.graphqlVariables,
    wsOutboundMessage: req.wsOutboundMessage
      ? substituteVariables(req.wsOutboundMessage, vars)
      : req.wsOutboundMessage,
    mqttTopic: req.mqttTopic
      ? substituteVariables(req.mqttTopic, vars)
      : req.mqttTopic,
  };
}

export function unresolvedVariables(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) {
    found.add(m[1]);
  }
  return [...found];
}
