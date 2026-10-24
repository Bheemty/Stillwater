# Stillwater Hall — the complete concert demo

A cinematic scroll journey using the six supplied films, followed by event information, FAQ, closing invitation and footer. The booking experience includes 72 sample seats across front/middle/rear and left/centre/right blocks, a persistent summary, validated attendee details, simulated payment and a printable/downloadable digital ticket with a verified scannable demo QR code.

## Preview

Public website: **https://stillwater-concert-experience.vercel.app/**


The local preview runs at **http://127.0.0.1:5173/**. Build output is generated locally and is excluded from Git.

For a normal Node.js installation (22.12+; tested with Node 24):

```sh
npm install
npm test
npm run build
npm run preview
```

Open the address Vite prints, normally http://127.0.0.1:4173/. `npm run dev` builds and serves a preview on port 5173; it intentionally does not use the dependency prebundler that failed in this Windows sandbox. After editing source, restart it to rebuild. `pnpm install` also works with the included lockfile.

After building, you can also serve the generated build with Python:

```sh
python -m http.server 5173 --bind 127.0.0.1 --directory dist
```

Serve through HTTP, not by opening `index.html` as a local file. Stop an existing process using a port before starting another server on that port.

## Try the experience

- Scroll forwards and backwards through all six clips. The dots jump to meaningful chapter holds. “Still views” provides static chapter navigation; the OS reduced-motion preference enables that mode on initial load.
- At front, middle and rear holds, open the corresponding seat zone. The camera never has clickable targets attached to moving film.
- The map is **explicitly schematic**, not a verified venue plan. It covers left, centre and right seats. Mobile starts with the accessible list; a horizontally scrollable map is also available. Hover previews an unpinned seat; focus shows its details. Click or tap an available seat to select it immediately, and click or tap again to remove it. There is no separate Select seat button. Multiple selections persist across zones.
- Available = ○, unavailable = ×, selected = ✓, with accompanying labels. Unavailable seats remain keyboard-focusable for details but cannot be selected.
- Select seats across zones and check the summary. Prices are £85/£65/£45, plus a clearly stated £2 sample fee per selected seat. All money calculations use integer pence.
- Enter sample attendee details. There is no real card form, payment, email delivery, backend reservation or scarcity claim.
- The generated ticket can be revisited from the footer, downloaded as a self-contained SVG, or printed/saved to PDF through the browser print dialog. The QR contains only a `DEMO-SW-…` reference. Tickets visibly say they are not valid for entry.
- Selections and the latest demo ticket persist in this browser. Email is not saved. Project credits includes a reset control for sample data.
- After the rear hold, the sticky venue naturally scrolls upwards into the closing content. Scrolling back re-enters the same rear frame and reverses the journey without clearing selections.

## Implementation

The existing Vite/plain-JavaScript stack is retained. Moving footage now uses the browser's native video compositor: copying each decoded frame into WebGL was expensive in browser tests. Three.js 0.180.0 remains the still-view renderer, with Canvas 2D fallback. `?renderer=three` is available for comparison, but is not the default performance path. This remains prerendered footage, not a navigable 3D venue model. GSAP ScrollTrigger supplies one global scroll timeline, without extra playhead smoothing or wheel interception.

The approved trimmed journey is one continuous **1,444-frame / 24 fps** MP4 per device size: desktop 1280×720 (41.2 MB), mobile 768×432 (19.8 MB). Every frame is independently decodable, so reverse seeks do not decode preceding GOP frames. Only one variant is loaded. One seek can be in flight; intermediate requests are discarded in favour of the latest scroll position. HTML scene copy follows the displayed frame. Media work pauses while a dialog covers the tour. The original image derivatives remain intact for still views and the diagnostic legacy renderer (`?engine=frames`).

This removes the per-frame network request queue and repeated video-to-WebGL copies from the normal journey. Browser-managed video buffering still depends on network speed; zero buffering on every connection is not guaranteed. Portrait retains the composed widescreen media band so side seating and architecture remain visible. See `docs/SCROLL-PERFORMANCE.md` for measured results and limits.

### Edit points

| File | Responsibility |
|---|---|
| `src/data.js` | Sample event, programme, prices, availability, seats, media ranges and scroll weights |
| `src/media.js` | Continuous film timeline, displayed-frame overlays, still mode |
| `src/scroll-decoder.js` | Single native video and serialized latest-target seeking |
| `src/film-renderer.js` | Three.js film display, colour space, viewport composition, Canvas fallback and GPU disposal |
| `src/main.js` | Scene-specific HTML copy, navigation, closing information |
| `src/booking.js` | Selection, validation, local persistence, checkout, QR and ticket |
| `src/style.css` | Identity, responsive composition, dialogs and print styles |
| `public/media/manifest.json` | Actual extracted counts and payload sizes |
| `scripts/prepare_media.py` | Optional regeneration from the six numbered originals |

Regeneration requires `pip install imageio-ffmpeg`, then `python scripts/prepare_media.py "path/to/source-folder"`. The originals stay intact; included derivatives mean regeneration is unnecessary to run the project.

Regenerate the continuous all-keyframe delivery movies with `python scripts/prepare_continuous.py "path/to/source-folder"` using the same dependency. This preserves the approved source trims and original files.

## Verification and limits

Production build and five focused Node tests passed. Browser checks exercised all six clips and forward/reverse boundaries, static chapter navigation, rear release/re-entry, restored scroll position, desktop and mobile layouts, keyboard inspection, unavailable protection, side-seat selection, cross-zone totals, deselection, inline validation, simulated checkout, ticket persistence and SVG download. The downloaded QR was decoded independently with ZXing and contained only the expected demo reference. Browser error/warning logs were empty during the checked flows.

Screenshots, the downloaded sample ticket, and verification notes remain in `review/` in the original local delivery. These local review artifacts are excluded from this repository. The native OS print/save dialog and physical printer were not exercised. Automatic OS reduced-motion detection is implemented; the equivalent still-view mode was exercised through the interface. No formal Lighthouse, field Core Web Vitals, throttled-network or physical-device performance claim is made.

The films are user-supplied AI footage. Architectural details, chair spacing and lighting drift slightly between shots; these are not a geometrically validated 3D model. The turn is trimmed at 6.25s to match clip five at 0.125s, substantially reducing their source join mismatch. Other joins are close, without long dissolves. Source detail is limited to 720p. Seat availability, positions, event facts and checkout are demonstration data, not a real bookable event.

## Skills and attribution

Installed guidance inspected and applied: `frontend-design`, `scroll-video-website`, `gsap-scrolltrigger`, `performance`, `playwright`. Browser testing used the available in-app browser Playwright controls; a separate DevTools trace/field telemetry capability was unavailable. FFmpeg was supplied through the installed `imageio-ffmpeg` package for local media work. See `ATTRIBUTION.md` and `public/licenses/`.

## GitHub and deployment

Repository: https://github.com/Bheemty/Stillwater

```sh
git clone https://github.com/Bheemty/Stillwater.git
cd Stillwater
npm install
npm test
npm run build
npm run preview
```

The `main` branch tracks `origin/main`. Use `git pull --ff-only` to retrieve updates, and `git push` to publish committed changes. GitHub authentication is required for writing; use Git Credential Manager or GitHub CLI rather than storing credentials in source files or remote URLs.

Import this repository into Vercel as a Vite project. The included `vercel.json` specifies `npm run build` and the `dist` output folder. No environment variables or backend services are required for this demo. Optimized media frames and license notices are committed; original video files, dependencies, generated builds, local screenshots and review artifacts are excluded.




Renderer verification: the active canvas exposes `data-renderer="three-webgl"` and its Three.js revision. Append `?renderer=canvas` to a local preview URL to exercise the same Canvas fallback drawing path without requiring a GPU failure. No second animation loop is introduced; frames are rendered by the existing GSAP ticker. No 3D venue asset was added.

Three.js renderer verification (22 October 2026): all eight Node tests and the production build passed. Local browser checks confirmed WebGL r180, one GPU texture and one draw call, stage/rear chapter navigation and reverse scrolling, immediate multi-seat toggles, deselection and cross-zone totals (£174 for two front seats; £154 for one front and one middle seat, including fees). Desktop and 390×844 portrait screenshots were inspected. Forced Canvas fallback retained the same composition. Browser warning/error logs were empty. Mobile checks used browser viewport emulation, not a physical phone. Actual GPU context loss was not induced. This renderer change adds Three.js to the downloaded JavaScript; it does not claim a loading or scrolling performance improvement.

Smoothness refinement (23 October 2026): see [measurement and verification report](docs/smoothness-pass.md). Run npm run test:loader for the repeatable loader regression check. All 12 Node tests pass; mobile verification uses browser viewport emulation.
