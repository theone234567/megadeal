/**
 * Stand-in for Next's `server-only` package under Vitest.
 *
 * `server-only` exists to make a build fail if a server module is ever
 * pulled into a client bundle, and it does that by resolving to a file
 * that throws. Vitest resolves it the same way, so importing any module
 * carrying the guard would fail the test rather than the build — which
 * would leave exactly the server-side code that most needs covering as
 * the code that cannot be tested. The guard stays on in the real build;
 * this only neutralises it for the test runner.
 */
export {};
