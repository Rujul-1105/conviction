/**
 * Lazy IDL loader for the counter spike.
 *
 * The hand-rolled JSON next to this file ships with the bundle, but a stale
 * Next.js dev cache or a missing asset can return `undefined` from a static
 * `import "./idl.json"` and crash `new Program(idl, provider)` with the
 * cryptic "Cannot use 'in' operator to search for 'instructions' in
 * undefined". Loading async and exposing `loadIdl()` keeps the failure
 * observable and the UI safe (program stays null until the IDL resolves).
 */

import type { Idl } from "@coral-xyz/anchor";

let cached: Idl | null = null;
let pending: Promise<Idl> | null = null;

export async function loadIdl(): Promise<Idl> {
  if (cached) return cached;
  if (pending) return pending;
  pending = import("./idl.json")
    .then((m) => {
      const json = (m.default ?? m) as Idl;
      if (!json || typeof json !== "object" || !("instructions" in json)) {
        throw new Error("IDL missing `instructions` — idl.json failed to load");
      }
      cached = json;
      return cached;
    })
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

export const COUNTER_PROGRAM_ID =
  process.env.NEXT_PUBLIC_COUNTER_PROGRAM_ID ||
  // Best-effort fallback; for the spike the address is also embedded in the
  // generated IDL itself.
  "2Prk1oV522ED8y5tsHXXxLYfBaPVYSHLEwRoXg3At979";
