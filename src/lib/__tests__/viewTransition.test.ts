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
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      };
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

  it('swallows a rejected ready/updateCallbackDone (aborted transition)', async () => {
    mockReducedMotion(false);
    const rejected = Promise.reject(new DOMException('aborted', 'InvalidStateError'));
    const start = vi.fn((cb: () => void) => {
      cb();
      return {
        finished: Promise.resolve(),
        ready: rejected,
        updateCallbackDone: rejected,
      };
    });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
    const onUnhandled = vi.fn();
    process.on('unhandledRejection', onUnhandled);

    await withViewTransition(vi.fn(), 'tab-fwd');
    await new Promise((r) => setTimeout(r, 0));

    process.off('unhandledRejection', onUnhandled);
    expect(onUnhandled).not.toHaveBeenCalled();
  });

  it('runs the second concurrent update inline instead of a nested transition', async () => {
    mockReducedMotion(false);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const start = vi.fn((cb: () => void) => {
      cb();
      return { finished: gate, ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;

    const first = withViewTransition(vi.fn(), 'tab-fwd'); // holds inFlight
    const secondUpdate = vi.fn();
    await withViewTransition(secondUpdate, 'tab-back'); // should NOT call start again

    expect(start).toHaveBeenCalledOnce();
    expect(secondUpdate).toHaveBeenCalledOnce();
    release();
    await first;
  });
});
