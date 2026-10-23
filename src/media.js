import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { journeyLength, locate, chapters } from "./data";
import { createFilmRenderer } from "./film-renderer";
import { frameAt, clampFrame, frameWindow, displayedPosition, boundaryFrames } from "./frame-policy.js";
gsap.registerPlugin(ScrollTrigger);
const base = import.meta.env.BASE_URL;
export function startJourney(onScene) {
  const canvas = document.querySelector("#cinema"),
    display = createFilmRenderer(canvas, {
      forceCanvas:
        new URLSearchParams(location.search).get("renderer") === "canvas",
    }),
    section = document.querySelector("#journey"),
    stage = section.firstElementChild,
    state = document.querySelector(".media-state"),
    message = document.querySelector("#media-message"),
    retry = document.querySelector("#media-retry");
  const mobile = matchMedia("(max-width:700px)").matches,
    cache = new Map(),
    pending = new Set(),
    failed = new Set(),
    posters = new Map(),
    imageFrames = new WeakMap();
  const progressBar = document.querySelector("#journey-bar"),
    chapterIndex = document.querySelector("#chapter-index"),
    chapterTitle = document.querySelector("#chapter-title");
  let lastChapter = "", variant = mobile ? "mobile" : "desktop", resizePending = false, pixelRatio = 0;
  let queue = [],
    active = 0,
    target = 0,
    current = 0,
    last = performance.now(),
    lastDraw = "",
    width = 0,
    height = 0,
    sectionTop = 0,
    sectionBottom = 0,
    trigger,
    still = matchMedia("(prefers-reduced-motion:reduce)").matches,
    scene = "",
    disposed = false,
    framesDrawn = 0,
    displayed = null,
    previousPosition = null,
    velocity = 0,
    latency = 0.12,
    requestsStarted = 0,
    decodeFailures = 0;
  const maxCache = mobile ? 26 : 38,
    key = (c, f) => `${variant}/${c}/${f}`,
    url = (c, f) =>
      `${base}media/${c}/${variant}/${String(f).padStart(4, "0")}.webp`;
  function trim() {
    if (cache.size <= maxCache) return;
    const pos = locate(current),
      f = clampFrame(pos.clip, Math.round(pos.time * 24) + 1);
    const edges = new Set(boundaryFrames(pos).map(t => key(t.c, t.f)));
    const ranked = [...cache.keys()].sort((a, b) => {
      const [ac, af] = a.split("/").slice(-2).map(Number),
        [bc, bf] = b.split("/").slice(-2).map(Number);
      return (
        (edges.has(a) ? 12 : (ac === pos.clip ? Math.abs(af - f) : 10000)) -
        (edges.has(b) ? 12 : (bc === pos.clip ? Math.abs(bf - f) : 10000))
      );
    });
    for (const k of ranked.slice(maxCache)) cache.delete(k);
  }
  function pump() {
    if (disposed || document.hidden || document.querySelector("dialog[open]")) return;
    while (active < 4 && queue.length) {
      const t = queue.shift(),
        k = key(t.c, t.f);
      if (cache.has(k) || pending.has(k) || failed.has(k)) continue;
      active++;
      pending.add(k);
      const img = new Image();
      img.decoding = "async";
      const started = performance.now();
      const requestedVariant = variant;
      requestsStarted++;
      img.onload = async () => {
        // Complete decoding before upload; onload alone can defer decode to draw.
        try { await img.decode(); } catch { decodeFailures++; }
        pending.delete(k);
        active--;
        if (disposed || requestedVariant !== variant) { pump(); return; }
        latency = latency * 0.8 + Math.min(0.5, (performance.now() - started) / 1000) * 0.2;
        imageFrames.set(img, { clip: t.c, frame: t.f });
        cache.set(k, img);
        trim();
        pump();
      };
      img.onerror = () => {
        pending.delete(k);
        active--;
        failed.add(k);
        pump();
      };
      img.src = url(t.c, t.f);
    }
  }
  function request(c, f, priority = false) {
    f = clampFrame(c, f);
    const k = key(c, f);
    if (cache.has(k) || pending.has(k) || failed.has(k)) return;
    queue = queue.filter((x) => key(x.c, x.f) !== k);
    priority ? queue.unshift({ c, f }) : queue.push({ c, f });
  }
  function loadWindow(c, f, pos) {
    queue = [];
    for (const nf of frameWindow(c, f, velocity, latency)) request(c, nf);
    // Warm the actual trimmed join, not an unused clip endpoint.
    for (const edge of boundaryFrames(pos)) request(edge.c, edge.f);
    pump();
  }
  function find(c, f) {
    if (cache.has(key(c, f))) return cache.get(key(c, f));
    let best,
      dist = Infinity;
    for (const [k, img] of cache) {
      const [nc, nf] = k.split("/").slice(-2).map(Number);
      if (nc === c && Math.abs(nf - f) < dist) {
        dist = Math.abs(nf - f);
        best = img;
      }
    }
    return best;
  }
  // Give the opening scene the connection first. Other scenes load on approach.
  for (const c of [1]) {
    const img = new Image();
    img.onload = () => {
      posters.set(c, img);
      imageFrames.set(img, { clip: c, frame: 1 });
      lastDraw = "";
    };
    img.src = `${base}media/${c}-start.webp`;
  }
  function draw(img) {
    display.draw(img);
  }
  let lastRequested = "";
  function tick() {
    const now = performance.now(),
      dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (resizePending) { resizePending = false; resize(); }
    // Leave the canvas intact while it is covered, offscreen, or backgrounded.
    if (document.hidden || document.querySelector("dialog[open]") ||
        innerHeight + scrollY < sectionTop ||
        scrollY > sectionBottom) return;
    pump();
    current = still
      ? target
      : current + (target - current) * (1 - Math.exp(-dt * 15));
    if (Math.abs(current - target) < 0.0002) current = target;
    const pos = locate(current),
      f = clampFrame(pos.clip, frameAt(pos)),
      k = key(pos.clip, f);
    if (previousPosition?.clip === pos.clip) {
      const speed = (f - previousPosition.frame) / Math.max(dt, 1 / 120);
      velocity = velocity * 0.7 + speed * 0.3;
    } else velocity = 0;
    previousPosition = { clip: pos.clip, frame: f };
    if (lastRequested !== k) {
      loadWindow(pos.clip, f, pos);
      lastRequested = k;
    }
    const img = find(pos.clip, f) || posters.get(pos.clip);
    const drawKey = img?.src || "";
    if (img && lastDraw !== drawKey) {
      draw(img);
      framesDrawn++;
      lastDraw = drawKey;
      state.classList.add("ready");
      stage.dataset.clip = pos.clip;
      displayed = imageFrames.get(img) || {clip: pos.clip, frame: f};
      stage.dataset.frame = displayed.frame;
      stage.dataset.requestedFrame = f;
      stage.dataset.cached = cache.size;
      stage.dataset.exact = String(cache.has(k));
    }
    if (failed.has(k) && !img) {
      state.classList.remove("ready");
      message.textContent =
        "This scene could not load. Still views and the seat map are available.";
      retry.hidden = false;
    }
    // Keep overlays with the image that is actually on screen during slow loads.
    const shown = displayed?.clip === pos.clip
      ? displayedPosition(pos, displayed.frame)
      : null;
    if (shown && scene !== shown.scene) {
      scene = shown.scene;
      onScene(scene);
      stage.dataset.scene = scene;
    }
    progressBar.style.transform =
      `scaleX(${Math.max(0, Math.min(1, current / journeyLength))})`;
    if (!shown) return;
    const ch =
      [...chapters].reverse().find((c) => (shown?.progress ?? current) >= c.progress - 0.3) ||
      chapters[0];
    if (lastChapter === ch.key) return;
    lastChapter = ch.key;
    chapterIndex.textContent = String(
      chapters.indexOf(ch) + 1,
    ).padStart(2, "0");
    chapterTitle.textContent = ch.name;
    document
      .querySelectorAll("#chapter-nav button")
      .forEach((b) =>
        b.setAttribute("aria-current", String(b.dataset.chapter === ch.key)),
      );
  }
  function resize() {
    sectionTop = section.offsetTop;
    sectionBottom = sectionTop + section.offsetHeight;
    const w = stage.clientWidth, h = stage.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, w < 700 ? 2 : 1.5);
    if (w === width && h === height && dpr === pixelRatio) return;
    width = w;
    height = h;
    pixelRatio = dpr;
    const nextVariant = w < 700 ? "mobile" : "desktop";
    if (variant !== nextVariant) {
      variant = nextVariant;
      cache.clear(); queue = []; failed.clear(); lastRequested = "";
    }
    display.resize(width, height, dpr);
    lastDraw = "";
  }
  function setup() {
    trigger?.kill();
    section.classList.toggle("is-still", still);
    section.style.height = still
      ? "100svh"
      : `calc(100svh + ${journeyLength * (innerWidth < 700 ? 410 : 530)}px)`;
    if (!still)
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (s) => (target = s.progress * journeyLength),
        onRefresh: (s) => (target = s.progress * journeyLength),
      });
    document
      .querySelector("#still-mode")
      .setAttribute("aria-pressed", String(still));
    document.querySelector("#still-mode").textContent = still
      ? "Enable motion"
      : "Still views";
    document.querySelector("#scene-hint").hidden = still;
    resize();
    ScrollTrigger.refresh();
  }
  const nav = document.querySelector("#chapter-nav");
  nav.innerHTML = chapters
    .map(
      (c) =>
        `<button data-chapter="${c.key}" aria-label="Go to ${c.name}" title="${c.name}"><span>${c.name}</span></button>`,
    )
    .join("");
  function go(key) {
    const c = chapters.find((c) => c.key === key);
    if (!c) return;
    // Chapter controls are explicit skips. Do not request all intermediate scenes
    // during a catch-up sweep; ordinary forward/reverse scrolling is unchanged.
    target = current = c.progress;
    previousPosition = null;
    velocity = 0;
    lastRequested = "";
    if (still) {
      lastDraw = "";
      window.scrollTo({ top: section.offsetTop, behavior: "instant" });
    } else
      window.scrollTo({
        top:
          section.offsetTop +
          (c.progress / journeyLength) *
            (section.offsetHeight - stage.offsetHeight),
        behavior: "instant",
      });
  }
  nav.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) go(b.dataset.chapter);
  });
  function setMotionMode(nextStill) {
    const position = current;
    still = nextStill;
    setup();
    // Changing the document height must not send the camera back to the arrival.
    target = current = position;
    lastRequested = "";
    lastDraw = "";
    previousPosition = null;
    window.scrollTo({
      top: section.offsetTop + (still ? 0 : (position / journeyLength) * (section.offsetHeight - stage.offsetHeight)),
      behavior: "instant",
    });
  }
  document.querySelector("#still-mode").onclick = () => setMotionMode(!still);
  retry.onclick = () => {
    failed.clear();
    lastRequested = "";
    lastDraw = "";
    message.textContent = "Loading scene…";
    retry.hidden = true;
  };
  const scheduleResize = () => { resizePending = true; };
  window.addEventListener("resize", scheduleResize);
  ScrollTrigger.addEventListener("refresh", resize);
  matchMedia("(prefers-reduced-motion:reduce)").addEventListener(
    "change",
    (e) => {
      setMotionMode(e.matches);
    },
  );
  setup();
  gsap.ticker.add(tick);
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) return;
      disposed = true;
      display.dispose();
      gsap.ticker.remove(tick);
      trigger?.kill();
      window.removeEventListener("resize", scheduleResize);
      ScrollTrigger.removeEventListener("refresh", resize);
    },
  );
  window.addEventListener("pageshow", () => {
    if (disposed) return;
    last = performance.now(); lastDraw = "";
    resize(); ScrollTrigger.refresh();
  });
  return {
    go,
    get still() {
      return still;
    },
    stats: () => ({
      ...display.stats(),
      cached: cache.size,
      requestsStarted,
      decodeFailures,
      displayed,
      pending: pending.size,
      framesDrawn,
      target,
      current,
      scene,
      variant,
      failed: failed.size,
    }),
  };
}
