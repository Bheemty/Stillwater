# Scroll performance — 24 October 2026

Actual in-app Chromium browser against the local production build. No CPU or network throttling; cache was not forced cold. The same audit scrolls the complete tour forward in 20 seconds, holds for one second, reverses over 12 seconds and settles for two seconds. This is an intentionally brisk scrub, not field telemetry or a physical phone test. Invoke with `?audit=1`; click Run forward/reverse test. The panel is absent from normal visits.

| Metric | Original desktop | Updated desktop | Updated mobile viewport |
|---|---:|---:|---:|
| Viewport | 1280×720 | 1280×720 | 390×844 |
| Pauses exceeding 250ms during moving sections | 12 | 0 | 0 |
| Longest observed moving-section hold | 1099ms | 183ms | 67ms |
| rAF interval p95 | 66.6ms | 33.4ms | 33.4ms |
| Source-position error median | 0.583s | 0.208s | 0.125s |
| Source-position error p95 | 3.542s | 0.667s | 0.250s |
| Distinct frames drawn/displayed | 247 | 511 | 734 |

Position error is measured in source-film seconds, not input latency. A fast scroll advances the film several seconds per wall-clock second. These figures do not establish a universal 60fps or zero-buffering guarantee. Normal browser resource caching and background load are uncontrolled. No field Core Web Vitals, formal DevTools trace, throttled network or physical-phone measurements were available.

The original loader requested separate WebP files while scrolling and predicted ahead with a small decoded cache. A single seekable MP4 avoids that request/decode queue. All frames are keyframes, avoiding long GOP decode runs. Native video compositing avoids expensive copies into the WebGL canvas. Extra smoothing has been removed. The existing source trims, frame rate, layout and booking code are preserved.

Rejected experiments included repeatedly seeking GOP4 video through Three.js, forward/reverse playback-rate control, and worker-decoded frame caches. Actual browser tests did not meet the target, so these are not the deployed pipeline. The legacy image engine remains diagnostic only. Three.js still renders static views and is opt-in for moving-footage comparison.

Remaining limits: source footage is 720p; derivatives add a lossy encode at CRF22. The 41.2MB desktop / 19.8MB mobile film still requires bandwidth. The native browser controls buffering and range requests. Extremely fast scrubs can skip source frames. Architectural discontinuities already in the supplied AI clips cannot be fixed by delivery code. Native OS reduced motion and real touch hardware require device validation.

Regression checks after the final build: mobile layout immediate selection of A01 and A07, £170 seats + £4 fees = £174, both IDs retained through details/payment/ticket, rear-scene navigation, still-view toggle, lower-page FAQ access and desktop resize. Booking source code is unchanged. The audit checks actual frame progress both directions; chapter buttons were used only for separate regression checks. Source-derived joins and terminal seating holds are unchanged. The moving layer uses native compositing; still views continue through Three.js.
