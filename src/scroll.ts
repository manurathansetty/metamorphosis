import Lenis from "lenis";
import type { MorphState } from "./gl/particles.ts";

/**
 * Maps document scroll onto the morph timeline [0..4]:
 * 0 brain · 1 neurons · 2 globe · 3 satellites · 4 name.
 * The probe point (viewport centre) interpolates between section centres.
 */
export class ScrollDirector {
  readonly lenis: Lenis;
  private centers: number[] = [];
  private sections: HTMLElement[];
  private activeCluster = 0;
  timeline = 0;

  constructor() {
    this.lenis = new Lenis({ lerp: 0.075, smoothWheel: true });
    this.sections = Array.from(document.querySelectorAll<HTMLElement>("[data-shape]"));
    this.measure();
    window.addEventListener("resize", () => this.measure());

    // glass-card reveals
    const revealObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el, i) => {
      (el as HTMLElement).style.setProperty("--d", `${(i % 6) * 0.08}s`);
      revealObs.observe(el);
    });

    // which project cluster glows
    const projObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            this.activeCluster = Number((e.target as HTMLElement).dataset.cluster ?? 0);
            document.querySelectorAll(".card--project").forEach((c) => c.classList.toggle("is-active", c === e.target));
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    document.querySelectorAll(".card--project").forEach((el) => projObs.observe(el));

    // nav active state
    const navObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = e.target.id;
            document.querySelectorAll(".nav nav a").forEach((a) =>
              a.classList.toggle("active", a.getAttribute("href") === `#${id}`),
            );
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    this.sections.forEach((s) => navObs.observe(s));

    // anchor links through lenis
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (ev) => {
        const target = a.getAttribute("href")!;
        if (target.length > 1 && document.querySelector(target)) {
          ev.preventDefault();
          this.lenis.scrollTo(target, { offset: -20 });
        }
      });
    });
  }

  private measure(): void {
    this.centers = this.sections.map((s) => s.offsetTop + s.offsetHeight / 2);
  }

  /** advance lenis; returns the current morph state */
  update(time: number): MorphState {
    this.lenis.raf(time);
    const probe = window.scrollY + window.innerHeight / 2;
    const c = this.centers;
    let t = 0;
    if (probe <= c[0]) t = 0;
    else if (probe >= c[c.length - 1]) t = c.length - 1;
    else {
      for (let i = 0; i < c.length - 1; i++) {
        if (probe >= c[i] && probe < c[i + 1]) {
          t = i + (probe - c[i]) / (c[i + 1] - c[i]);
          break;
        }
      }
    }
    this.timeline = t;
    const a = Math.floor(t);
    return {
      shapeA: a,
      shapeB: Math.min(this.sections.length - 1, a + 1),
      progress: t - a,
      activeCluster: this.activeCluster,
    };
  }
}
