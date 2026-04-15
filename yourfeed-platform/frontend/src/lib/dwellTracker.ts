/**
 * Dwell tracker — uses IntersectionObserver to measure how long each post is
 * visible in the viewport. Accumulates total visible time and flags visibility
 * thresholds (1s, 3s, 5s) similar to FeedMonitor's events.js pattern.
 */

export interface DwellRecord {
  postId: string;
  position: number;
  totalMs: number;
  visible1s: boolean;
  visible3s: boolean;
  visible5s: boolean;
}

interface InternalState {
  position: number;
  enterTime: number | null;
  totalMs: number;
  visible1s: boolean;
  visible3s: boolean;
  visible5s: boolean;
  t1: number | null;
  t3: number | null;
  t5: number | null;
}

export class DwellTracker {
  private state = new Map<string, InternalState>();
  private observer: IntersectionObserver | null = null;
  private root: Element | null;

  constructor(root: Element | null) {
    this.root = root;
  }

  register(el: HTMLElement, postId: string, position: number) {
    this.state.set(postId, {
      position,
      enterTime: null,
      totalMs: 0,
      visible1s: false,
      visible3s: false,
      visible5s: false,
      t1: null,
      t3: null,
      t5: null,
    });
    el.setAttribute("data-post-id", postId);
    this.ensureObserver().observe(el);
  }

  private ensureObserver(): IntersectionObserver {
    if (this.observer) return this.observer;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const postId = (entry.target as HTMLElement).getAttribute("data-post-id");
          if (!postId) continue;
          const s = this.state.get(postId);
          if (!s) continue;

          if (entry.isIntersecting) {
            s.enterTime = performance.now();
            if (s.t1 === null) s.t1 = window.setTimeout(() => (s.visible1s = true), 1000);
            if (s.t3 === null) s.t3 = window.setTimeout(() => (s.visible3s = true), 3000);
            if (s.t5 === null) s.t5 = window.setTimeout(() => (s.visible5s = true), 5000);
          } else {
            if (s.enterTime !== null) {
              s.totalMs += performance.now() - s.enterTime;
              s.enterTime = null;
            }
            if (s.t1 !== null) {
              clearTimeout(s.t1);
              s.t1 = null;
            }
            if (s.t3 !== null) {
              clearTimeout(s.t3);
              s.t3 = null;
            }
            if (s.t5 !== null) {
              clearTimeout(s.t5);
              s.t5 = null;
            }
          }
        }
      },
      { root: this.root, threshold: 0.5 }
    );
    return this.observer;
  }

  /** Finalize all currently-visible posts and return the full dwell table. */
  snapshot(): DwellRecord[] {
    const now = performance.now();
    const out: DwellRecord[] = [];
    for (const [postId, s] of this.state.entries()) {
      let total = s.totalMs;
      if (s.enterTime !== null) total += now - s.enterTime;
      out.push({
        postId,
        position: s.position,
        totalMs: Math.round(total),
        visible1s: s.visible1s,
        visible3s: s.visible3s,
        visible5s: s.visible5s,
      });
    }
    return out.sort((a, b) => a.position - b.position);
  }

  destroy() {
    for (const s of this.state.values()) {
      if (s.t1 !== null) clearTimeout(s.t1);
      if (s.t3 !== null) clearTimeout(s.t3);
      if (s.t5 !== null) clearTimeout(s.t5);
    }
    this.observer?.disconnect();
    this.observer = null;
    this.state.clear();
  }
}
