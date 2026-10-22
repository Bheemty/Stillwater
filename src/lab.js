// Opt-in local lab counters; no telemetry is transmitted.
export function startLab() {
  const output = document.createElement("output");
  output.id = "lab-report";
  output.hidden = true;
  document.body.append(output);
  const start = performance.now();
  const data = {
    frames: 0,
    gaps50: 0,
    longTasks: 0,
    longTaskMs: 0,
    chapterMutations: 0,
    bookingMutations: 0,
    clicks: [],
    intervals: [],
  };
  let previous = start;
  function frame(now) {
    const delta = now - previous;
    previous = now;
    if (delta < 1000) {
      data.frames++;
      data.intervals.push(delta);
      if (delta > 50) data.gaps50++;
    }
    if (data.intervals.length > 3000) data.intervals.shift();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  new MutationObserver(
    (records) => (data.chapterMutations += records.length),
  ).observe(document.querySelector(".journey-controls"), {
    subtree: true,
    attributes: true,
    childList: true,
    characterData: true,
  });
  new MutationObserver(
    (records) => (data.bookingMutations += records.length),
  ).observe(document.querySelector("#booking-content"), {
    subtree: true,
    childList: true,
  });
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        data.longTasks++;
        data.longTaskMs += e.duration;
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {}
  document.addEventListener(
    "click",
    (e) => {
      const seat = e.target.closest("[data-seat],#toggle-seat,[data-remove]");
      if (!seat) return;
      const before = performance.now();
      queueMicrotask(() => {
        requestAnimationFrame(() => {
          if (data.clicks.length >= 200) data.clicks.shift();
          data.clicks.push({
            seat: seat.dataset.seat || seat.dataset.remove || "action",
            nextFrameMs: +(performance.now() - before).toFixed(2),
          });
        });
      });
    },
    true,
  );
  setInterval(() => {
    const sorted = [...data.intervals].sort((a, b) => a - b),
      resources = performance.getEntriesByType("resource");
    output.textContent = JSON.stringify({
      ...data,
      intervals: undefined,
      elapsedMs: Math.round(performance.now() - start),
      frameP95Ms: +(sorted[Math.floor(sorted.length * 0.95)] || 0).toFixed(2),
      mediaRequests: resources.filter((e) => e.name.includes("/media/")).length,
      mediaTransferredBytes: resources
        .filter((e) => e.name.includes("/media/"))
        .reduce((n, e) => n + e.transferSize, 0),
    });
  }, 500);
}
