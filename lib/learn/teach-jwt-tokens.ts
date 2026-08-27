/**
 * Precomputed JWT strings for teach.lab presets — safe to import from client bundles.
 * Generated with HS256 secret `http-learning-checker-teach-secret` (see teach-jwt.ts).
 */

export const TEACH_JWT_VALID =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsZWFybmVyIiwibmFtZSI6IkhUVFAgTGFiIFVzZXIiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6NDEwMjQ0NDgwMH0.uXLYceJuCjcabHff2Ligoj6KRS64_FVQg2lrem_ZICM";

export const TEACH_JWT_EXPIRED =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsZWFybmVyIiwiZXhwIjoxNTE2MjM5MDIyfQ.7ur-JEucu5M6GxAPgfX2klSnsU6dkraIKNN7pXvzTuI";

/** Valid token with last signature character tampered. */
export const TEACH_JWT_BAD_SIGNATURE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsZWFybmVyIiwibmFtZSI6IkhUVFAgTGFiIFVzZXIiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6NDEwMjQ0NDgwMH0.uXLYceJuCjcabHff2Ligoj6KRS64_FVQg2lrem_ZICA";

export const TEACH_JWT_URL = "https://teach.local/jwt";
