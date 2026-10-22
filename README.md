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
- The map is **explicitly schematic**, not a verified venue plan. It covers left, centre and right seats. Mobile starts with the accessible list; a horizontally scrollable map is also available. Hover previews an unpinned seat; clicking or focusing pins its details so scrolling to the action cannot accidentally change the seat. Click another seat to inspect it.
- Available = ○, unavailable = ×, selected = ✓, with accompanying labels. Unavailable seats remain keyboard-focusable for details but cannot be selected.
- Select seats across zones and check the summary. Prices are £85/£65/£45, plus a clearly stated £2 sample fee per selected seat. All money calculations use integer pence.
- Enter sample attendee details. There is no real card form, payment, email delivery, backend reservation or scarcity claim.
- The generated ticket can be revisited from the footer, downloaded as a self-contained SVG, or printed/saved to PDF through the browser print dialog. The QR contains only a `DEMO-SW-…` reference. Tickets visibly say they are not valid for entry.
- Selections and the latest demo ticket persist in this browser. Email is not saved. Project credits includes a reset control for sample data.
- After the rear hold, the sticky venue naturally scrolls upwards into the closing content. Scrolling back re-enters the same rear frame and reverses the journey without clearing selections.

## Implementation

The existing Vite/plain-JavaScript stack was retained. Three.js has been removed from runtime dependencies. GSAP ScrollTrigger supplies the single global timeline, and one GSAP ticker advances the smoothed canvas playhead. There is no wheel interception, custom scroll engine, autoplay, audio or invented venue geometry.

The 62-second source set is converted at its native **24 fps** into **1,488 WebP frames per variant**: desktop 1280×720 and mobile 768×432. Full frame payloads are about **59.7 MB desktop / 33.0 MB mobile**, but the page loads a current-frame window and adjacent boundaries progressively. It does not download or retain the entire sequence before display. The application cache is capped at **38 desktop / 26 mobile image references**, plus six small scene posters. Browser-managed caches are outside that cap.

Frames preserve bidirectional seeking without video decoder/keyframe stalls. The larger asset set is the deliberate tradeoff for deterministic seeking; production delivery should use a CDN with immutable caching and compression for text assets. Slow-network and physical-device GPU profiling remain outstanding. Portrait uses a composed widescreen media band so side seating and architecture remain visible.

### Edit points

| File | Responsibility |
|---|---|
| `src/data.js` | Sample event, programme, prices, availability, seats, media ranges and scroll weights |
| `src/media.js` | Progressive frame loader, bounded cache, canvas sizing, global scroll timeline, still mode |
| `src/main.js` | Scene-specific HTML copy, navigation, closing information |
| `src/booking.js` | Selection, validation, local persistence, checkout, QR and ticket |
| `src/style.css` | Identity, responsive composition, dialogs and print styles |
| `public/media/manifest.json` | Actual extracted counts and payload sizes |
| `scripts/prepare_media.py` | Optional regeneration from the six numbered originals |

Regeneration requires `pip install imageio-ffmpeg`, then `python scripts/prepare_media.py "path/to/source-folder"`. The originals stay intact; included derivatives mean regeneration is unnecessary to run the project.

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


