"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeInvalidate } from "@/lib/http";

export type QueryState<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "success"; data: T; error: undefined }
  | { status: "error"; data: undefined; error: string };

/**
 * Run an async API call, and run it again after any mutation (`invalidate()`)
 * or when the tab regains focus. Shows `loading` only on the first load;
 * refreshes keep the previous data.
 */
export function useQuery<T>(
  fn: () => Promise<T>,
  deps: readonly (string | number | boolean | null | undefined)[],
): QueryState<T> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({
    status: "loading",
    data: undefined,
    error: undefined,
  });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const runId = useRef(0);

  const run = useCallback(() => {
    const id = ++runId.current;
    fnRef
      .current()
      .then((data) => {
        if (id === runId.current)
          setState({ status: "success", data, error: undefined });
      })
      .catch((e: unknown) => {
        if (id === runId.current)
          setState({
            status: "error",
            data: undefined,
            error: e instanceof Error ? e.message : "Something went wrong.",
          });
      });
  }, []);

  // Re-run when the caller's inputs change. Inputs are primitives (ids,
  // filters), so a JSON key is a stable comparison.
  const key = JSON.stringify(deps);
  // biome-ignore lint/correctness/useExhaustiveDependencies: key encodes deps
  useEffect(() => {
    setState({ status: "loading", data: undefined, error: undefined });
    run();
    const onFocus = () => run();
    window.addEventListener("focus", onFocus);
    const offInvalidate = subscribeInvalidate(run);
    return () => {
      window.removeEventListener("focus", onFocus);
      offInvalidate();
    };
  }, [key, run]);

  return { ...state, refetch: run };
}
