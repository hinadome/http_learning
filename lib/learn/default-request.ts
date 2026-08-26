import type { ComposedRequest } from "../types";

/** Default request state — merge presets/collections over this for a clean load. */
export const DEFAULT_REQUEST: ComposedRequest = {
  version: "1.1",
  method: "GET",
  url: "https://httpbin.org/get",
  headerText: `Host: httpbin.org
Accept: application/json
User-Agent: HTTP-Learning-Checker/1.0`,
  body: "",
  sendAnyway: false,
  allowPrivateTargets: false,
  followRedirects: false,
  maxRedirects: 5,
  protocol: "http",
  bodyType: "text",
  graphqlVariables: "{}",
  multipartFields: [],
  assertions: [],
};

export function mergePresetRequest(
  preset: ComposedRequest
): ComposedRequest {
  return { ...DEFAULT_REQUEST, ...preset };
}
