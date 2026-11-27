import { useCallback, useSyncExternalStore } from "react";

/* Session state that survives a tab switch.
   The Work tabs unmount when you leave them; anything kept here stays put
   until the page reloads, so a doc you edited or an envelope you sent is
   still there when you come back. Module-level code (timers that fake other
   people signing, for example) can write through setPersist directly. */

type Listener = () => void;
type Next<T> = T | ((prev: T) => T);

const values = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();

function ensure<T>(key: string, init: T | (() => T)): void {
  if (!values.has(key)) values.set(key, typeof init === "function" ? (init as () => T)() : init);
}

export function getPersist<T>(key: string, init: T | (() => T)): T {
  ensure(key, init);
  return values.get(key) as T;
}

export function setPersist<T>(key: string, next: Next<T>): void {
  const prev = values.get(key) as T;
  const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
  if (Object.is(value, prev)) return;
  values.set(key, value);
  listeners.get(key)?.forEach((l) => l());
}

export function usePersist<T>(key: string, init: T | (() => T)): [T, (next: Next<T>) => void] {
  ensure(key, init);
  const subscribe = useCallback(
    (cb: Listener) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(cb);
      return () => {
        set!.delete(cb);
      };
    },
    [key],
  );
  const value = useSyncExternalStore(subscribe, () => values.get(key) as T);
  const set = useCallback((next: Next<T>) => setPersist(key, next), [key]);
  return [value, set];
}
