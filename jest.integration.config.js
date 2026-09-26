/** Separate Jest project for integration/authorization tests (spec §45, §57).
 * These hit a real Supabase project and need SUPABASE_SERVICE_ROLE_KEY to
 * provision ephemeral test accounts — kept out of the default `npm test`
 * run (which must stay fast and network-free) via its own config.
 * See docs/TESTING.md for how to run this.
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/src/__tests__/integration/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.kilo/"],
  testTimeout: 30000,
};
