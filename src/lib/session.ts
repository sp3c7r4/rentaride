"use client";

/**
 * Client view of the session. The session itself is an httpOnly cookie the
 * browser can't read; this asks `GET /api/auth/me` and keeps the answer.
 */
import { useSyncExternalStore } from "react";
import { apiGet, subscribeInvalidate } from "@/lib/http";
import type { User } from "@/lib/types";

export type SessionState =
  | { status: "loading"; user: null }
  | { status: "signed_out"; user: null }
  | { status: "signed_in"; user: User };

const LOADING: SessionState = { status: "loading", user: null };
const SIGNED_OUT: SessionState = { status: "signed_out", user: null };

let state: SessionState = LOADING;
let inflight: Promise<SessionState> | null = null;
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  for (const l of listeners) l();
}

/** Fetch the session from the server and update every `useSession`. */
export function refreshSession(): Promise<SessionState> {
  inflight ??= apiGet<{ user: User | null }>("/api/auth/me")
    .then(({ user }) => {
      const next: SessionState = user
        ? { status: "signed_in", user }
        : SIGNED_OUT;
      set(next);
      return next;
    })
    .catch(() => {
      // Network trouble: keep what we had rather than signing the user out.
      if (state.status === "loading") set(SIGNED_OUT);
      return state;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Mark the session signed out locally (after sign-out). */
export function clearSession() {
  set(SIGNED_OUT);
}

/** Last known user, without waiting. Null while loading or signed out. */
export function getSessionUser(): User | null {
  return state.user;
}

let started = false;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void refreshSession();
    // Profile, KYC or role changes come through mutations.
    subscribeInvalidate(() => void refreshSession());
    window.addEventListener("focus", () => void refreshSession());
  }
  return () => {
    listeners.delete(listener);
  };
}

/** Current session. `loading` during SSR and until the first response. */
export function useSession(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
}
