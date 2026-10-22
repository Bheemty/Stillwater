import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { journeyLength, locate, chapters, segments } from "./data";
import { FrameStore } from "./frame-store";
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
const base = import.meta.env.BASE_URL;
const bounds = new Map(
  [1, 2, 3, 4, 5, 6].map((clip) => {
    const ranges = segments.filter((s) => s.clip === clip);
    return [
      clip,
      [
        Math.round(Math.min(...ranges.map((s) => s.from)) * 24) + 1,
        Math.round(Math.max(...ranges.map((s) => s.to)) * 24) + 1,
      ],
    ];
  }),
);
export function startJourney(onScene) {
  const canvas = document.querySelector("#cinema"),
    ctx = canvas.getContext("2d", { alpha: false }),
    section = document.querySelector("#journey"),
    stage = section.firstElementChild,
    state = document.querySelector(".media-state"),
    message = document.querySelector("#media-message"),
    retry = document.querySelector("#media-retry"),
    bar = document.querySelector("#journey-bar"),
    index = document.querySelector("#chapter-index"),
    title = document.querySelector("#chapter-title"),
    nav = document.querySelector("#chapter-nav");
  let target = 0,
    current = 0,
    last = performance.now(),
    width = 0,
    height = 0,
    trigger,
    still = matchMedia("(prefers-reduced-motion:reduce)").matches,
    scene = "",
    lastDraw = "",
    lastRequested = "",
    variant = "",
    mobile = false,
    framesDrawn = 0,
    running = false,
    paused = false,
    sizeDirty = false,
    chapter = "",
    progress = -1;
  const key = (c, f) => `${c}/${f}`,
    clampFrame = (c, f) =>
      Math.max(bounds.get(c)[0], Math.min(bounds.get(c)[1], f));
  async function load(k, signal) {
    const [c, f] = k.split("/");
    const response = await fetch(
      `${base}media/${c}/${variant}/${f.padStart(4, "0")}.webp`,
      { signal, priority: "high" },
    );
    if (!response.ok) throw new Error("Scene load failed");
    const blob = await response.blob();
    signal.throwIfAborted();
    if (typeof createImageBitmap === "function") return createImageBitmap(blob);
    const image = new Image(),
      url = URL.createObjectURL(blob);
    try {
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const store = new FrameStore(load, wake);
  function wake() {
    if (!running && !paused && !document.hidden) {
      last = performance.now();
      running = true;
      gsap.ticker.add(tick);
    }
  }
  function sleep() {
    running = false;
    gsap.ticker.remove(tick);
  }
  function plan(c, f) {
    const keys = [key(c, f)],
      direction = target >= current ? 1 : -1;
    for (let d = 1; d <= 6; d++) {
      keys.push(key(c, clampFrame(c, f + d * direction)));
      if (d <= 3) keys.push(key(c, clampFrame(c, f - d * direction)));
    }
    // Prepare only the boundary we are approaching, not all six scenes on arrival.
    const ranges = segments.filter((s) => s.clip === c),
      start = Math.round(ranges[0].from * 24) + 1,
      end = Math.round(Math.max(...ranges.map((s) => s.to)) * 24) + 1;
    if (f >= end - 12 && c < 6)
      keys.push(
        key(
          c + 1,
          Math.round(segments.find((s) => s.clip === c + 1).from * 24) + 1,
        ),
      );
    if (f <= start + 12 && c > 1)
      keys.push(
        key(
          c - 1,
          Math.round(
            Math.max(
              ...segments.filter((s) => s.clip === c - 1).map((s) => s.to),
            ) * 24,
          ) + 1,
        ),
      );
    store.plan(keys);
  }
  function find(c, f) {
    let result,
      dist = Infinity,
      frame = f;
    for (const [k, image] of store.cache) {
      const [clip, n] = k.split("/").map(Number);
      if (clip === c && Math.abs(n - f) < dist) {
        dist = Math.abs(n - f);
        result = image;
        frame = n;
      }
    }
    return result ? { image: result, frame } : null;
  }
  function draw(image) {
    let dw, dh;
    if (width / height > 16 / 9) {
      dw = width;
      dh = (width * 9) / 16;
    } else {
      dh = height;
      dw = (height * 16) / 9;
    }
    if (width < 700 || width / height < 1.05) {
      dw = width;
      dh = (width * 9) / 16;
      ctx.fillStyle = "#20251f";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, Math.round(height * 0.32), dw, dh);
    } else ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
  }
  function displayedScene(pos, frame) {
    if (pos.clip === 1) return frame < 289 ? "arrival" : "lobby";
    if (pos.clip === 5) return frame <= 63 ? "front" : "middle";
    if (pos.clip === 4)
      return frame >= 151 && pos.scene === "front" ? "front" : "turn";
    return pos.scene;
  }
  function updateScene(next) {
    if (next === scene) return;
    scene = next;
    onScene(scene);
    stage.dataset.scene = scene;
    const ch =
      chapters.find(
        (c) =>
          c.key ===
          (scene === "turn"
            ? "stage"
            : scene === "auditorium"
              ? "lobby"
              : scene),
      ) || chapters[0];
    if (ch.key !== chapter) {
      chapter = ch.key;
      index.textContent = String(chapters.indexOf(ch) + 1).padStart(2, "0");
      title.textContent = ch.name;
      nav
        .querySelectorAll("button")
        .forEach((b) =>
          b.setAttribute("aria-current", String(b.dataset.chapter === ch.key)),
        );
    }
  }
  function tick() {
    if (paused || document.hidden) {
      sleep();
      return;
    }
    if (sizeDirty) {
      sizeDirty = false;
      resize();
    }
    const now = performance.now(),
      dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    // Preserve the existing response rate; never add smoothing to hide missed frames.
    current = still
      ? target
      : current + (target - current) * (1 - Math.exp(-dt * 15));
    if (Math.abs(current - target) < 0.0002) current = target;
    const pos = locate(current),
      f = clampFrame(pos.clip, Math.round(pos.time * 24) + 1),
      k = key(pos.clip, f);
    if (lastRequested !== k) {
      lastRequested = k;
      plan(pos.clip, f);
    }
    const visible = find(pos.clip, f),
      drawKey = visible ? key(pos.clip, visible.frame) : "";
    if (visible && lastDraw !== drawKey) {
      draw(visible.image);
      framesDrawn++;
      lastDraw = drawKey;
      state.classList.add("ready");
      stage.dataset.clip = pos.clip;
      stage.dataset.frame = visible.frame;
      stage.dataset.exact = String(visible.frame === f);
      updateScene(displayedScene(pos, visible.frame));
    }
    // A hold can change semantics at the same film frame.
    if (visible && visible.frame === f) updateScene(displayedScene(pos, f));
    stage.dataset.cached = store.cache.size;
    stage.dataset.pending = store.active.size;
    stage.dataset.paused = "false";
    if (store.failed.has(k)) {
      state.classList.remove("ready");
      message.textContent =
        "This scene could not load. Still views and the seat map are available.";
      retry.hidden = false;
    }
    if (progress !== current) {
      progress = current;
      bar.style.transform = `scaleX(${Math.max(0, Math.min(1, current / journeyLength))})`;
    }
    if (current === target) sleep(); // Decodes and scroll updates wake only when needed.
  }
  function resize() {
    const w = stage.clientWidth,
      h = stage.clientHeight,
      widthChanged = w !== width;
    if (w === width && h === height) return;
    const old = target,
      wasInside =
        trigger &&
        window.scrollY >= trigger.start &&
        window.scrollY <= trigger.end;
    width = w;
    height = h;
    mobile = matchMedia("(max-width:700px), (pointer:coarse)").matches;
    const next = mobile ? (width >= 700 ? "mobile" : "mobile640") : "desktop";
    if (variant !== next) {
      variant = next;
      store.clear();
      lastRequested = "";
      store.limit = mobile ? 26 : 38;
      store.concurrency = mobile ? 2 : 3;
    }
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastDraw = "";
    if (widthChanged && trigger) {
      section.style.height = `calc(100svh + ${journeyLength * (innerWidth < 700 ? 410 : 530)}px)`;
      ScrollTrigger.refresh();
      if (wasInside) {
        target = current = old;
        window.scrollTo({
          top:
            trigger.start +
            (old / journeyLength) * (trigger.end - trigger.start),
          behavior: "instant",
        });
      }
    }
  }
  function setup() {
    trigger?.kill();
    trigger = null;
    section.classList.toggle("is-still", still);
    section.style.height = still
      ? "100svh"
      : `calc(100svh + ${journeyLength * (innerWidth < 700 ? 410 : 530)}px)`;
    resize();
    if (!still)
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (s) => {
          target = s.progress * journeyLength;
          wake();
        },
        onRefresh: (s) => {
          target = s.progress * journeyLength;
          wake();
        },
      });
    const control = document.querySelector("#still-mode");
    control.setAttribute("aria-pressed", String(still));
    control.textContent = still ? "Enable motion" : "Still views";
    document.querySelector("#scene-hint").hidden = still;
    ScrollTrigger.refresh();
    wake();
  }
  nav.innerHTML = chapters
    .map(
      (c) =>
        `<button data-chapter="${c.key}" aria-label="Go to ${c.name}" title="${c.name}"><span>${c.name}</span></button>`,
    )
    .join("");
  function go(k) {
    const ch = chapters.find((c) => c.key === k);
    if (!ch) return;
    if (still) {
      target = current = ch.progress;
      window.scrollTo({ top: section.offsetTop, behavior: "instant" });
      wake();
    } else
      window.scrollTo({
        top:
          trigger.start +
          (ch.progress / journeyLength) * (trigger.end - trigger.start),
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
    store.failed.clear();
    lastRequested = "";
    message.textContent = "Loading scene…";
    retry.hidden = true;
    wake();
  };
  const observer = new ResizeObserver(() => {
    sizeDirty = true;
    wake();
  });
  observer.observe(stage);
  const dialogs = [...document.querySelectorAll("dialog")];
  function pause() {
    paused = document.hidden || dialogs.some((d) => d.open);
    stage.dataset.paused = String(paused);
    store.pause(paused);
    if (paused) sleep();
    else {
      lastRequested = "";
      wake();
    }
  }
  const modalObserver = new MutationObserver(pause);
  dialogs.forEach((d) =>
    modalObserver.observe(d, { attributes: true, attributeFilter: ["open"] }),
  );
  document.addEventListener("visibilitychange", pause);
  matchMedia("(prefers-reduced-motion:reduce)").addEventListener(
    "change",
    (e) => {
      still = e.matches;
      setup();
    },
  );
  setup();
  window.addEventListener(
    "pagehide",
    () => {
      sleep();
      store.pause(true);
    },
    { once: true },
  );
  window.addEventListener("pageshow", pause);
  return {
    go,
    get still() {
      return still;
    },
    stats: () => ({
      cached: store.cache.size,
      pending: store.active.size,
      framesDrawn,
      target,
      current,
      scene,
      variant,
      paused,
      failed: store.failed.size,
    }),
  };
}
