# Cinematic flow refinement — 23 October 2026

Design, footage, chapter order, approved trims, seating pauses and booking flow are preserved. Three.js still renders the films. No stronger scroll smoothing, scroll traps, replacement imagery or generated footage was added.

## Before/after evidence

| Signal | Desktop before | Desktop after | Mobile before | Mobile after |
|---|---:|---:|---:|---:|
| Repeated draws of the same image | 1,701 | 0 | 1,704 | 0 |
| Requests started, including poster | 1,499 | 1,288 | 1,499 | 1,290 |
| 95th-percentile frame-distance score | 19 | 8 | 19 | 8 |
| Unintended reverse steps | 3 | 0 | 3 | 0 |
| Draws behind booking dialog | 0 | 0 | 0 | 0 |

These are deterministic **loader simulations, not browser FPS, network benchmarks, Core Web Vitals or field data**. The harness executes the actual player source with synthetic images: 120 ms per request, four sequence loads in flight, a 60 Hz virtual clock, a 68-second route (30 seconds forward, rear pause, 30 seconds reverse), and a two-second booking interruption. It does not model bandwidth contention, GPU cost or actual decoding. The frame-distance score compares the displayed frame with the playhead frame; an absent/wrong-clip image receives a 192-frame penalty. It is a comparison score, not a wall-clock delay. Baseline: `0abee3a`. Raw results: `smoothness-before.json` and `smoothness-after.json`.

Run `npm run test:loader` to reproduce the updated regression check. For the baseline, save `git show 0abee3a:src/media.js` to a temporary file, then pass its path to `node scripts/loader-bench.mjs <path>`. The original source uses its own original policy; the updated source imports current policy helpers.

No DevTools trace, CPU/network throttling, CrUX or first-party real-user telemetry was available through the connected browser tools. No real-device or production FPS claim is made.

## Causes addressed

- The draw key included the requested frame even when the image was unchanged. Drawing now depends on the actual image or a required viewport repaint.
- Symmetric requests could chase the scroll position. The queue predicts ahead using measured request latency and movement direction while retaining the exact target. Concurrency and cache limits remain bounded.
- Neighbor prefetch used untrimmed endpoints; eviction could immediately discard boundary frames. Actual approved join frames now stay in cache, including clip 4 frame 151 and clip 5 frame 4.
- Images decode before upload. The opening poster gets the connection first; subsequent scenes prepare on approach.
- Text follows displayed footage when loading falls behind. Chapter controls skip directly to their destination rather than sweeping through intermediate scenes.
- Resize work is coalesced through the existing GSAP ticker. Unchanged dimensions avoid renderer reallocation; refreshed section bounds remain current. Portrait pixel ratio can reach 2 on capable devices. Crossing the portrait breakpoint switches frame variants without mixing old pending loads into the new cache.
- Still-view/motion switching retains tour position. Back/forward-cache returns retain the renderer.
- Header contrast uses cached geometry instead of layout reads on every scroll and competing observer updates.
- Media suspension behind booking dialogs is preserved. No source resolution, cadence or compression quality was reduced.

## Verification

Local production build, in-app Chromium, unthrottled localhost; desktop approximately 1265×712 and viewport overrides 390×844, 844×390 and 390×780. Cache was not controlled. These are functional/visual checks, not page-load timing comparisons.

Checked arrival, lobby, full stage, front/middle/rear, forward/reverse seating scroll, rear release to closing content, still-view chapters, orientation/height resizing, WebGL with one texture/one draw call, and empty warning/error logs. Desktop before/after screenshots and mobile composition were inspected. CSS, typography, colours and spacing are unchanged.

Booking: A01 + A08 + D03 + G07 totalled £288 including fees. Removing A01 yielded £201. A08, D03 and G07 all appeared on the generated digital ticket with £201. Keyboard Space toggled A01 immediately; A04 remained unavailable. Mobile viewport checks covered the accessible list and selection state. These were browser pointer/keyboard checks, not physical-phone touch tests. Local sample data was cleared after testing.

All 12 Node tests, loader assertions and production build pass. Actual GPU context loss, a real mobile toolbar, constrained cellular networks and physical-phone thermals were not tested.

## Remaining limits

All six originals are 1280×720 at 24 fps. Their detail, cadence, architecture drift and residual shot mismatches remain source limitations; rendering cannot recover missing 4K detail. Very fast swipes on slow/interrupted connections can still outrun loading; a nearby/previous image remains visible instead of a blank frame. The full desktop sequence is about 59.7 MB and mobile about 33.0 MB, loaded on demand. Higher-resolution, better-matched source films are required for a further material quality increase.
