import { Grid } from '../core';

// Touch scrolling. The grid's only scroll input is the wheel: `mousewheel`
// normalizes deltas and `pixel-scroll-model` feeds them to `scrollTo`. Touch is
// just a second input into that same sink. Wheel gets inertia for free (the OS
// keeps firing decaying wheel events after a trackpad flick); touch gives one
// touchend and silence, so we synthesize the flick ourselves.
//
// Physics is ported from a phone-tested prototype. Two things it punted on are
// handled here for embedding: edge handoff (release the gesture to the page at a
// scroll edge instead of trapping it) and gesture arbitration (a small drag slop
// so a tap still selects a cell while a real drag scrolls).

const DEFAULT_FRICTION = 0.95; // velocity kept per 16ms while a flick decays
const MIN_V = 0.02;            // px/ms; below this the flick is done
const VELOCITY_WINDOW_MS = 100;
const SLOP = 8;                // px of finger travel before a drag becomes a scroll
const MAX_SAMPLES = 12;
const INTENTION_ANGLE = 30;    // degrees; within this of an axis, lock to that axis (matches the wheel handler)

// Lock a delta/velocity vector to a single axis when it points within
// INTENTION_ANGLE of that axis, exactly like pixel-scroll-model's wheel handler.
// This is what makes edge handoff robust to a wobbly finger: a near-vertical drag
// at the vertical edge has its incidental horizontal zeroed, so nothing moves and
// we release the gesture to the page. Only a genuinely diagonal drag keeps both.
export function lockToIntention(x: number, y: number): { x: number; y: number } {
  if (x === 0 && y === 0) {
    return { x, y };
  }
  const withinAngle = (a: number, b: number) => Math.abs(Math.atan(a / b) * 57.29) < INTENTION_ANGLE;
  if (withinAngle(y, x)) {
    return { x, y: 0 }; // mostly horizontal
  }
  if (withinAngle(x, y)) {
    return { x: 0, y }; // mostly vertical
  }
  return { x, y }; // diagonal: keep both
}

export interface ISample { x: number; y: number; t: number; }

export interface IFlick {
  readonly vx: number;
  readonly vy: number;
  // advance one frame to the given timestamp; returns whether the flick lives on.
  step(ts: number): boolean;
}

export interface ITouch {
  // bind the touch listeners to the grid container (called from grid.build).
  bindTo(container: HTMLElement): void;
  // exposed for tests: release-velocity from a sample window, a steppable flick,
  // and the axis-lock used for edge handoff.
  _computeReleaseVelocity(samples: ISample[]): { vx: number; vy: number };
  _makeFlick(vx: number, vy: number, seed: number): IFlick;
  _lockToIntention(x: number, y: number): { x: number; y: number };
}

type Phase =
  | 'idle'      // no active gesture (or a multi-touch we ignore)
  | 'pending'   // one finger down, under the slop: still could be a tap
  | 'scroll'    // claimed: we own the gesture and scroll the grid
  | 'released'; // handed to the page (started at an edge in the drag direction)

export function create(grid: Grid): ITouch {
  const friction = grid.opts.touchFriction != null ? grid.opts.touchFriction : DEFAULT_FRICTION;

  let phase: Phase = 'idle';
  let startX = 0;
  let startY = 0; // touchstart origin, for the slop test
  let lastX = 0;
  let lastY = 0;  // previous move point, for the per-move delta
  let samples: ISample[] = [];
  let flickRaf = 0;

  function stopFlick() {
    if (flickRaf) {
      cancelAnimationFrame(flickRaf);
    }
    flickRaf = 0;
  }

  // Move the grid by a pixel delta; returns whether it actually moved on each
  // axis. scrollTo clamps synchronously, so a false here means we hit an edge.
  function scrollBy(dx: number, dy: number) {
    const pm = grid.pixelScrollModel;
    const t0 = pm.top;
    const l0 = pm.left;
    pm.scrollTo(t0 - dy, l0 - dx);
    return { movedX: pm.left !== l0, movedY: pm.top !== t0 };
  }

  function onStart(e: TouchEvent) {
    stopFlick();
    if (e.touches.length !== 1) {
      phase = 'idle'; // let the browser own multi-touch (pinch-zoom)
      return;
    }
    const t = e.touches[0];
    phase = 'pending';
    startX = lastX = t.clientX;
    startY = lastY = t.clientY;
    samples = [{ x: t.clientX, y: t.clientY, t: e.timeStamp }];
    // Deliberately no preventDefault: an under-slop tap must keep producing the
    // synthetic mousedown/click that the grid uses for cell selection.
  }

  function onMove(e: TouchEvent) {
    if (phase === 'idle' || phase === 'released') {
      return;
    }
    if (e.touches.length !== 1) {
      end(e); // became a pinch mid-drag: give the gesture up
      return;
    }
    const t = e.touches[0];
    // Lock the move to its intended axis before scrolling. Near-axis drags scroll
    // straight (no cross-axis drift) and, crucially, the claim decision below sees
    // only the intended axis.
    const { x: dx, y: dy } = lockToIntention(t.clientX - lastX, t.clientY - lastY);
    lastX = t.clientX;
    lastY = t.clientY;

    if (phase === 'pending') {
      // Under the slop it's still a tap: don't claim, don't scroll.
      if (Math.abs(t.clientX - startX) < SLOP && Math.abs(t.clientY - startY) < SLOP) {
        return;
      }
      // Past the slop: try to consume the drag. If the grid can move along the
      // intended axis we claim it (and preventDefault suppresses the synthetic
      // click, so no cell selection). If it can't (already at that edge) we
      // release so the page scrolls: the grid is not a scroll trap. Because the
      // move is axis-locked, a near-vertical drag at the vertical edge releases
      // even when the grid has horizontal room.
      // ponytail: preventDefault is per-event, not per-axis, so the claim is one
      // decision for the whole gesture. Good enough; overscroll-behavior exists
      // because the browser can't do better here either.
      const moved = scrollBy(dx, dy);
      if (!moved.movedX && !moved.movedY) {
        phase = 'released';
        return;
      }
      phase = 'scroll';
    } else {
      scrollBy(dx, dy);
    }

    samples.push({ x: t.clientX, y: t.clientY, t: e.timeStamp });
    if (samples.length > MAX_SAMPLES) {
      samples.shift();
    }
    e.preventDefault(); // we own this gesture; don't also scroll the page
  }

  // touchend and touchcancel both release here: iOS can fire touchcancel instead
  // of touchend on a fast flick, and we still want the momentum.
  function end(e: TouchEvent) {
    const wasScrolling = phase === 'scroll';
    phase = 'idle';
    if (!wasScrolling) {
      return;
    }
    // Fold in the real lift point and time. On a hard flick this captures the
    // final motion; after a pre-lift pause the trailing window spans a big time
    // gap with ~no displacement, so velocity comes out ~0 (a stop, no flick).
    const lift = e.changedTouches[0];
    if (lift) {
      samples.push({ x: lift.clientX, y: lift.clientY, t: e.timeStamp });
    }
    const raw = _computeReleaseVelocity(samples);
    // Lock the flick to the drag's dominant axis too, so momentum matches the
    // straight-line scroll (a near-vertical flick doesn't drift sideways).
    const { x: vx, y: vy } = lockToIntention(raw.vx, raw.vy);
    if (Math.abs(vx) < MIN_V && Math.abs(vy) < MIN_V) {
      return;
    }
    const flick = _makeFlick(vx, vy, performance.now());
    const run = (ts: number) => {
      flickRaf = flick.step(ts) ? requestAnimationFrame(run) : 0;
    };
    flickRaf = requestAnimationFrame(run);
  }

  // Release velocity over a short trailing window of samples, not the single last
  // move. Sample times are the browser event timestamp, not performance.now() at
  // handler time: the per-move handler repaints the grid and can lag the finger,
  // so processing-time velocity understates a hard flick and misfires the "did
  // they pause?" test. Event time is immune.
  function _computeReleaseVelocity(s: ISample[]) {
    const n = s.length;
    if (n < 2) {
      return { vx: 0, vy: 0 };
    }
    const newest = s[n - 1];
    let i = n - 1;
    while (i > 0 && newest.t - s[i - 1].t < VELOCITY_WINDOW_MS) {
      i--;
    }
    const oldest = s[i];
    const wdt = newest.t - oldest.t;
    if (wdt <= 0) {
      return { vx: 0, vy: 0 };
    }
    return { vx: (newest.x - oldest.x) / wdt, vy: (newest.y - oldest.y) / wdt };
  }

  function _makeFlick(vx0: number, vy0: number, seed: number): IFlick {
    let vx = vx0;
    let vy = vy0;
    let prev = seed;
    return {
      get vx() { return vx; },
      get vy() { return vy; },
      step(ts: number) {
        // rAF's timestamp is the already-started frame's time, so on frame 0 it
        // can be <= the performance.now() we seeded prev with, giving dt<=0.
        // dt=0 => scrollBy(0,0) => "didn't move" => the edge check below kills
        // the flick after one frame. Floor to a real interval; cap so a stalled
        // or backgrounded frame can't teleport.
        const dt = Math.min(Math.max(ts - prev, 1), 50);
        prev = ts;
        const moved = scrollBy(vx * dt, vy * dt);
        const decay = friction ** (dt / 16);
        vx *= decay;
        vy *= decay;
        if (!moved.movedX) {
          vx = 0; // hit an edge: kill that axis
        }
        if (!moved.movedY) {
          vy = 0;
        }
        return Math.abs(vx) >= MIN_V || Math.abs(vy) >= MIN_V;
      }
    };
  }

  let unbindDom: (() => void) | undefined;
  function bindTo(container: HTMLElement) {
    if (unbindDom) {
      unbindDom();
    }
    // pan-x pan-y (not `none`): keeps native pinch-zoom, and lets the page scroll
    // when we release a gesture at an edge. Don't force `none` from the library.
    container.style.touchAction = 'pan-x pan-y';
    // touchmove must be passive:false or preventDefault() is ignored.
    container.addEventListener('touchstart', onStart, { passive: false });
    container.addEventListener('touchmove', onMove, { passive: false });
    container.addEventListener('touchend', end);
    container.addEventListener('touchcancel', end);
    unbindDom = () => {
      stopFlick();
      container.removeEventListener('touchstart', onStart);
      container.removeEventListener('touchmove', onMove);
      container.removeEventListener('touchend', end);
      container.removeEventListener('touchcancel', end);
    };
  }

  grid.eventLoop.bind('grid-destroy', () => {
    if (unbindDom) {
      unbindDom();
    }
  });

  return { bindTo, _computeReleaseVelocity, _makeFlick, _lockToIntention: lockToIntention };
}

export default create;
