// @ts-check
// A tiny store for state several parts of the page share. State is replaced, never changed in place (a Set that changes is
// replaced by a new Set), so "did it change" is a plain comparison; `set` takes the changed keys (or a function of the current
// state that returns them) and tells the subscribers once, and not at all when nothing changed.

/**
 * @template {Record<string, any>} T
 * @param {T} initial
 */
export function createStore(initial) {
    let state = initial;
    /** @type {Set<(state: T) => void>} */
    const subscribers = new Set();
    return {
        get: () => state,
        /** @param {Partial<T> | ((state: T) => Partial<T>)} patch */
        set(patch) {
            const changes = typeof patch === "function" ? patch(state) : patch;
            if (Object.keys(changes).every((k) => Object.is(state[k], changes[k]))) return;
            state = { ...state, ...changes };
            subscribers.forEach((fn) => fn(state));
        },
        /** Calls `fn(state)` after each change. Returns a function that stops it. */
        subscribe(/** @type {(state: T) => void} */ fn) {
            subscribers.add(fn);
            return () => { subscribers.delete(fn); };
        },
    };
}
