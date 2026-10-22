# Booking and mobile optimization — 22 October 2026

## Measurement conditions

Before and after: compiled local Vite builds, same in-app Chromium browser and host, 390×844 portrait viewport (375 CSS pixels available with the scrollbar), and 1280×720 desktop override. No CPU or network throttling was available. Caches were not forcibly cleared; request counts are navigation observations and payload sizes are exact file totals, not cold-start transfer timings. The opt-in `?measure` module recorded browser animation-frame intervals, resource entries, DOM mutations and activation-to-next-animation-frame samples. This is single-session lab evidence, not field Core Web Vitals, a GPU trace, input-to-photon latency or a physical-phone test. The three mobile booking samples below compare the actual old two-step selection workflow with the new immediate-toggle workflow; app/media were already loaded and the dialog was open. Different run durations make aggregate long-task counts unsuitable for before/after comparisons.

| Signal | Before | After | Interpretation |
|---|---:|---:|---|
| Active portrait frame payload, all six clips | 33,046,062 bytes | 26,758,984 bytes | 19.0% smaller; 1,488 frames retained at 24 fps, WebP quality 80 |
| Portrait frame dimensions | 768×432 | 640×360 | 30.6% fewer decoded pixels per frame; older derivatives and original videos preserved |
| Initial media requests while stationary | 18 | 7 | Opening frame and nearby frames first; no six-poster sweep or distant boundary requests |
| Stationary chapter DOM writes | 5,800 mutations / 2,904 rAF observations | 2 initial mutations / 1,554 rAF observations | Repeated text rewriting removed; UI changes only when its value changes |
| Mobile activation → next frame, 3 samples | 93.1, 32.0, 35.2 ms | 25.1, 11.6, 6.3 ms | Median 35.2 → 11.6 ms in this small local sample; not a general device guarantee |
| Animation-frame interval p95 | about 17 ms | about 17 ms | No meaningful overall refresh-rate change demonstrated on this unthrottled host |
| Media requests during covered booking | Media ticker remained active | Count stayed at 7 throughout tested desktop booking | Fetches abort/pause; draws stop; no new background decode jobs start |
| Seat-map DOM during selection | Entire booking content replaced | Existing seat element retained | Only changed seat, details, summary and live count/total update |

Raw samples and before/after screenshots are retained locally in `review/`. They are excluded from Git.

## Findings and changes

The application does not seek MP4 video at runtime: it scrubs independently decodable WebP frames. MP4 keyframe encoding and overlapping `currentTime` seeks are therefore not causes in this implementation. The measured wasted chapter writes and full-dialog selection rebuilds were removed. Repeated `Intl.NumberFormat` construction was also eliminated.

The original image loader left obsolete in-flight requests running, assigned resources before explicit decoding, woke redraws for every load completion and requested six posters at startup. The new bounded scheduler prioritizes the latest target, cancels obsolete fetches, waits for bitmap decoding, closes evicted bitmaps and preloads only a small local window plus an approaching neighbouring clip boundary. These mechanisms reduce request/decoder competition; without a GPU/network trace their contribution to real-phone dropped frames cannot be isolated quantitatively.

The existing GSAP requestAnimationFrame ticker is the only scroll playhead loop. It now sleeps when settled and pauses behind any modal or hidden tab. The existing smoothing coefficient is unchanged. Header state uses IntersectionObserver instead of repeated layout reads in a scroll listener. Canvas dimensions are measured on ResizeObserver notifications only. Width/orientation changes preserve logical journey progress; toolbar-like height changes do not recreate the timeline.

The existing seven-pixel backdrop blur and small seat shadows were retained. Freezing the covered canvas removes its continuous changes beneath the blur. No stronger smoothing, scroll interception, footage edits, layout redesign or scene-order changes were introduced.

## Booking clarity

Available seats immediately toggle by click, tap-style activation or native Enter/Space. Hover/focus reveals details without a separate action button. Unavailable seats use native disabled controls. The sticky live summary includes the count, total and fees. Selected IDs persist across zones, dialogs, checkout and tickets.

A compact whole-hall schematic shows stage direction, Front/Middle/Rear zones, Left/Centre/Right blocks, and two aisles. It highlights the map zone and separately labels the paused tour zone. The explicit label is **Demo selection — selected rows only**. Seventy-two demo seats are a subset, not the auditorium capacity; no exact match to the generated footage is claimed.

## Verification

- Eight Node tests passed, including obsolete-request cancellation, modal pause/resume and bounded decoded-bitmap disposal.
- Desktop and portrait mobile-sized interactions: immediate multiple selection, deselection, disabled A04, keyboard focus details and Space toggling.
- A01 + A08 + D03 + G07 = £280 + £8 fees = £288; switching zones retained all four.
- Mobile A02/A07 toggles updated live totals immediately; removal restored the original £288.
- The four exact IDs survived attendee details, payment review and digital ticket generation; ticket showed all four IDs, Admit 4 and £288.
- Forward/reverse seating movement, middle hold (clip 5 frame 192), rear hold (clip 6 frame 192), native footer release and reverse re-entry checked.
- Portrait→landscape→portrait and toolbar-like viewport-height changes retained rear scene/frame 192 and selection state.
- Desktop/mobile hero screenshots inspected against baseline. Original CSS/layout is preserved outside the requested booking additions; mobile image detail changes slightly with its smaller derivative.
- Browser warning/error log was empty during the tested flow.

## Remaining limits

No physical phone, true touch-event emulation, slow-network/CPU throttling, Safari/Firefox check, DevTools GPU trace or field telemetry was available. Mobile-sized pointer activation exercises the tap interaction design but is not a real-device touch claim. Source footage still has its existing AI architecture/lighting drift and 720p ceiling. A complete portrait journey still transfers about 26.8 MB if every frame is visited; desktop remains about 59.7 MB. High-latency networks and low-end phone GPUs remain the main unverified bottlenecks. An already-running decode cannot always be interrupted, but concurrency is bounded and no new work starts while booking covers the venue.

