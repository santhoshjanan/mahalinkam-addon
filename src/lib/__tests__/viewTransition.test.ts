import { describe, it, expect, vi, afterEach } from 'vitest';
import { supportsViewTransitions, withViewTransition } from '../viewTransition';

const realMatchMedia = window.matchMedia;

afterEach(() => {
  delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  window.matchMedia = realMatchMedia;
  delete document.documentElement.dataset.vt;
});

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reduce }) as unknown as typeof matchMedia;
}

describe('withViewTransition', () => {
  it('runs the update synchronously and skips data-vt when the API is absent', async () => {
    mockReducedMotion(false);
    const update = vi.fn();
    await withViewTransition(update, 'tab-fwd');
    expect(update).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.vt).toBeUndefined();
    expect(supportsViewTransitions()).toBe(false);
  });

  it('skips the transition under prefers-reduced-motion even when supported', async () => {
    mockReducedMotion(true);
    const start = vi.fn();
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
    const update = vi.fn();
    await withViewTransition(update, 'filing');
    expect(update).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });

  it('drives startViewTransition and tags/clears <html data-vt>', async () => {
    mockReducedMotion(false);
    let vtDuringCallback: string | undefined;
    const start = vi.fn((cb: () => void) => {
      cb();
      vtDuringCallback = document.documentElement.dataset.vt;
      return { finished: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;

    const update = vi.fn();
    await withViewTransition(update, 'drill-in');

    expect(start).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(vtDuringCallback).toBe('drill-in');
    expect(document.documentElement.dataset.vt).toBeUndefined(); // cleared on finish
    expect(supportsViewTransitions()).toBe(true);
  });
});
