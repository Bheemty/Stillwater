import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { journeyLength, locate, chapters, segments } from "./data";
import { createFilmRenderer } from "./film-renderer";
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
    variant = mobile ? "mobile" : "desktop",
    cache = new Map(),
    pending = new Set(),
    failed = new Set(),
    posters = new Map();
  const progressBar = document.querySelector("#journey-bar"),
    chapterIndex = document.querySelector("#chapter-index"),
    chapterTitle = document.querySelector("#chapter-title");
  let lastChapter = "";
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
    framesDrawn = 0;
  const maxCache = mobile ? 26 : 38,
    key = (c, f) => `${c}/${f}`,
    url = (c, f) =>
      `${base}media/${c}/${variant}/${String(f).padStart(4, "0")}.webp`,
    clampFrame = (c, f) =>
      Math.max(1, Math.min(c === 1 ? 480 : c === 2 ? 240 : 192, f));
  function trim() {
    if (cache.size <= maxCache) return;
    const pos = locate(current),
      f = clampFrame(pos.clip, Math.round(pos.time * 24) + 1);
    const ranked = [...cache.keys()].sort((a, b) => {
      const [ac, af] = a.split("/").map(Number),
        [bc, bf] = b.split("/").map(Number);
      return (
        (ac === pos.clip ? 0 : 10000) +
        Math.abs(af - f) -
        ((bc === pos.clip ? 0 : 10000) + Math.abs(bf - f))
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
      img.onload = () => {
        pending.delete(k);
        active--;
        if (disposed) return;
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
  function loadWindow(c, f) {
    queue = [];
    request(c, f, true);
    for (let d = 1; d <= 9; d++) {
      request(c, f + d);
      request(c, f - d);
    }
    for (const nc of [c - 1, c + 1].filter((x) => x >= 1 && x <= 6)) {
      request(nc, 1);
      request(
        nc,
        Math.round(
          Math.max(...segments.filter((s) => s.clip === nc).map((s) => s.to)) *
            24,
        ) + 1,
      );
    }
    pump();
  }
  function find(c, f) {
    if (cache.has(key(c, f))) return cache.get(key(c, f));
    let best,
      dist = Infinity;
    for (const [k, img] of cache) {
      const [nc, nf] = k.split("/").map(Number);
      if (nc === c && Math.abs(nf - f) < dist) {
        dist = Math.abs(nf - f);
        best = img;
      }
    }
    return best;
  }
  for (let c = 1; c <= 6; c++) {
    const img = new Image();
    img.onload = () => {
      posters.set(c, img);
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
      f = clampFrame(pos.clip, Math.round(pos.time * 24) + 1),
      k = key(pos.clip, f);
    if (lastRequested !== k) {
      loadWindow(pos.clip, f);
      lastRequested = k;
    }
    const img = find(pos.clip, f) || posters.get(pos.clip);
    const drawKey = img ? `${k}:${img.src}` : "";
    if (img && lastDraw !== drawKey) {
      draw(img);
      framesDrawn++;
      lastDraw = drawKey;
      state.classList.add("ready");
      stage.dataset.clip = pos.clip;
      stage.dataset.frame = f;
      stage.dataset.cached = cache.size;
      stage.dataset.exact = String(cache.has(k));
    }
    if (failed.has(k)) {
      state.classList.remove("ready");
      message.textContent =
        "This scene could not load. Still views and the seat map are available.";
      retry.hidden = false;
    }
    if (scene !== pos.scene) {
      scene = pos.scene;
      onScene(scene);
      stage.dataset.scene = scene;
    }
    progressBar.style.transform =
      `scaleX(${Math.max(0, Math.min(1, current / journeyLength))})`;
    const ch =
      [...chapters].reverse().find((c) => current >= c.progress - 0.3) ||
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
    width = stage.clientWidth;
    height = stage.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
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
    if (still) {
      target = current = c.progress;
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
  document.querySelector("#still-mode").onclick = () => {
    still = !still;
    setup();
  };
  retry.onclick = () => {
    failed.clear();
    lastRequested = "";
    lastDraw = "";
    message.textContent = "Loading scene…";
    retry.hidden = true;
  };
  window.addEventListener("resize", resize);
  matchMedia("(prefers-reduced-motion:reduce)").addEventListener(
    "change",
    (e) => {
      still = e.matches;
      setup();
    },
  );
  setup();
  gsap.ticker.add(tick);
  window.addEventListener(
    "pagehide",
    () => {
      disposed = true;
      display.dispose();
      gsap.ticker.remove(tick);
      trigger?.kill();
      window.removeEventListener("resize", resize);
    },
    { once: true },
  );
  return {
    go,
    get still() {
      return still;
    },
    stats: () => ({
      ...display.stats(),
      cached: cache.size,
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
