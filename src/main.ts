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
  // fade the "scroll to morph" hint the moment the user starts scrolling (works
  // in both the WebGL and static paths)
  const onScroll = (): void => { document.body.classList.toggle("scrolled", window.scrollY > 24); };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

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

  const loop = (time: number): void => {
    const morph = director.update(time);
    stage.setZoomForTimeline(director.timeline);
    stage.render(morph);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot();
