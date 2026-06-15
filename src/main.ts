import "./style.css";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglOK(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

async function boot(): Promise<void> {
  if (reducedMotion || !webglOK()) {
    document.body.classList.add("static");
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
    return;
  }

  // wait for the display font so the "MANU" particle shape uses real letterforms
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1800))]);

  const [{ Stage }, { ScrollDirector }] = await Promise.all([
    import("./gl/scene.ts"),
    import("./scroll.ts"),
  ]);

  const canvas = document.querySelector<HTMLCanvasElement>("#gl")!;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 768;
  const count = coarse || small ? 18000 : 60000;

  const stage = new Stage(canvas, count);
  const director = new ScrollDirector();
  const heroFoot = document.querySelector<HTMLElement>(".hero__foot");

  const loop = (time: number): void => {
    const morph = director.update(time);
    stage.setZoomForTimeline(director.timeline);
    stage.render(morph);
    // footer opacity tied directly to scroll position (no CSS transition) so it
    // scrubs with the scroll rather than animating on its own afterwards
    if (heroFoot) {
      heroFoot.style.opacity = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.2)).toFixed(3);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot();
