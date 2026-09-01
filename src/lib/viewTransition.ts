/**
 * Same-document View Transitions for the popup's state changes.
 *
 * `withViewTransition` runs `update` inside `document.startViewTransition`, and
 * tags `<html data-vt="…">` for the duration so CSS can choose the right
 * choreography (which direction a tab slides, whether Settings wipes in or out,
 * the "file into the mark" collapse on save). When the API is unavailable
 * (Firefox < 129) or the user prefers reduced motion, it just calls `update()`
 * synchronously — every effect degrades to the instant state change.
 */
type VtName =
  | 'tab-fwd'
  | 'tab-back'
  | 'to-form'
  | 'to-list'
  | 'settings-in'
  | 'settings-out'
  | 'drill-in'
  | 'drill-out'
  | 'filing';

interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
}
type StartViewTransition = (cb: () => void | Promise<void>) => ViewTransition;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition ===
      'function'
  );
}

/** One transition at a time. A second nav while one is running just applies its
 *  change instantly — cleaner than letting the new transition abort the old one
 *  (which rejects the old one's `ready` with InvalidStateError). */
let inFlight = false;

/**
 * `update` should apply the state change AND resolve only once the DOM reflects
 * it (e.g. `mutate(); await nextTick()` under Vue), so the "new" snapshot is
 * the post-change DOM rather than a duplicate of "old".
 */
export function withViewTransition(
  update: () => void | Promise<void>,
  name: VtName,
): Promise<void> {
  const start = (document as unknown as { startViewTransition?: StartViewTransition })
    .startViewTransition;

  if (inFlight || prefersReducedMotion() || typeof start !== 'function') {
    return Promise.resolve(update());
  }

  const root = document.documentElement;
  root.dataset.vt = name;
  inFlight = true;
  const done = (): void => {
    inFlight = false;
    if (root.dataset.vt === name) delete root.dataset.vt;
  };

  let vt: ViewTransition;
  try {
    vt = start.call(document, update);
  } catch {
    // e.g. the document is mid-teardown — fall back to the plain update.
    done();
    return Promise.resolve(update());
  }

  // A skipped / aborted transition rejects `ready` (and can reject
  // `updateCallbackDone`); swallow both so they never surface as
  // "Uncaught (in promise)". `finished` still resolves once the DOM is updated.
  vt.ready?.catch(() => {});
  vt.updateCallbackDone?.catch(() => {});
  return vt.finished.then(done, done);
}
