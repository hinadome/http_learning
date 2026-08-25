import type { AssertionResult, RequestAssertion, SendResponse } from "../types";

export function newAssertionId(): string {
  return `as-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function runAssertions(
  assertions: RequestAssertion[] | undefined,
  response: SendResponse | undefined
): AssertionResult[] {
  if (!assertions?.length || !response) return [];

  return assertions.map((a) => {
    if (!a.expected.trim()) {
      return { id: a.id, passed: true, message: "Empty expectation (skipped)" };
    }

    if (a.kind === "status") {
      const expected = parseInt(a.expected, 10);
      const passed = response.status === expected;
      return {
        id: a.id,
        passed,
        message: passed
          ? `Status is ${expected}`
          : `Expected status ${expected}, got ${response.status}`,
      };
    }

    if (a.kind === "header") {
      const name = (a.target ?? "").toLowerCase();
      const entry = Object.entries(response.headers).find(
        ([k]) => k.toLowerCase() === name
      );
      const val = entry
        ? Array.isArray(entry[1])
          ? entry[1].join(", ")
          : String(entry[1])
        : "";
      const passed = val.toLowerCase().includes(a.expected.toLowerCase());
      return {
        id: a.id,
        passed,
        message: passed
          ? `Header ${a.target} contains "${a.expected}"`
          : `Header ${a.target} is "${val || "(missing)"}" — expected to contain "${a.expected}"`,
      };
    }

    const passed = response.body.includes(a.expected);
    return {
      id: a.id,
      passed,
      message: passed
        ? `Body contains "${a.expected}"`
        : `Body does not contain "${a.expected}"`,
    };
  });
}
