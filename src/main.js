import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "./style.css";
import { startBooking } from "./booking";
import { event, zones, money } from "./data";
import { ScrollTrigger } from "gsap/ScrollTrigger";
const booking = startBooking();
let currentScene = "arrival";
const copies = {
  arrival: {
    class: "hero-copy",
    html: `<p class="eyebrow">A place for live music.</p><h1>The night begins<br>before the <br>first note.</h1><p class="copy-support">Step inside. Find your place.<br>Make it a night to remember.</p><div class="hero-actions"><button class="light-button" data-go="lobby">Explore the venue <span aria-hidden="true">↓</span></button><button class="text-button" data-book>Choose your seat</button></div>`,
  },
  lobby: {
    class: "lobby-copy",
    html: `<p class="eyebrow">The art of arriving</p><h2>Leave the<br>everyday outside.</h2><p class="copy-support">A little space to pause.<br>A whole evening ahead.</p>`,
  },
  auditorium: {
    class: "quiet-copy",
    html: `<p>The room is ready.<br>Take your time.</p>`,
  },
  stage: {
    class: "stage-copy",
    html: `<p class="eyebrow">${event.name}</p><h2>One stage.<br>An unforgettable night.</h2><p class="copy-support">${event.date}<br>${event.venue} · ${event.time}</p><span class="scene-disclaimer">Sample event &amp; programme</span>`,
  },
  turn: { class: "quiet-copy", html: `<p>A different perspective.</p>` },
  front: {
    class: "seating-copy",
    html: `<p class="eyebrow">Front rows · From ${money(zones.front.price)}</p><h2>Find your place<br>in the moment.</h2><button class="light-button" data-book data-zone="front">Explore front seats <span aria-hidden="true">↗</span></button><p class="micro">Left, centre &amp; right · Sample availability</p>`,
  },
  middle: {
    class: "seating-copy",
    html: `<p class="eyebrow">Middle rows · From ${money(zones.middle.price)}</p><h2>Right in<br>the heart of it.</h2><button class="light-button" data-book data-zone="middle">Explore middle seats <span aria-hidden="true">↗</span></button><p class="micro">Left, centre &amp; right · Sample availability</p>`,
  },
  rear: {
    class: "seating-copy",
    html: `<p class="eyebrow">Rear rows · From ${money(zones.rear.price)}</p><h2>Your seat<br>is waiting.</h2><button class="light-button" data-book data-zone="rear">Explore rear seats <span aria-hidden="true">↗</span></button><p class="micro">○ Available &nbsp; × Unavailable &nbsp; ✓ Selected</p>`,
  },
};
function sceneChanged(key) {
  currentScene = key;
  const copy = copies[key];
  const el = document.querySelector("#scene-copy");
  el.className = `scene-copy ${copy.class}`;
  el.innerHTML = copy.html;
  document.querySelector("#scene-hint").innerHTML = [
    "front",
    "middle",
    "rear",
  ].includes(key)
    ? 'Pause here. Find your seat. <span aria-hidden="true">↓</span>'
    : 'Scroll to explore <span aria-hidden="true">↓</span>';
}
let journey=null,pendingChapter=null;
sceneChanged('arrival');
const engine=new URLSearchParams(location.search).get('engine')==='frames'
 ? import('./media-frames-legacy.js') : import('./media.js');
engine.then(({startJourney})=>{
 journey=startJourney(sceneChanged);
 if(pendingChapter)journey.go(pendingChapter);
 if(new URLSearchParams(location.search).has('audit'))import('./tour-audit.js').then(m=>m.mountAudit(journey));
}).catch(error=>{
 console.error('Tour initialization failed',error);
 const retry=document.querySelector('#media-retry');retry.hidden=false;retry.onclick=()=>location.reload();
 document.querySelector('#media-message').textContent='The tour could not start. Retry, or use the seat map.';
 document.querySelector('.media-state').classList.remove('ready');
});
document.addEventListener("click", (e) => {
  const book = e.target.closest("[data-book]");
  if (book) {
    booking.open(
      book.dataset.zone ||
        (["front", "middle", "rear"].includes(currentScene)
          ? currentScene
          : "front"),
    );
    return;
  }
  const go = e.target.closest("[data-go]");
  if(go){if(journey)journey.go(go.dataset.go);else pendingChapter=go.dataset.go;}
});
document.querySelector("#event-name").textContent = event.name;
document.querySelector("#event-date").innerHTML =
  `${event.date}<br><small>Doors ${event.doors} · Music ${event.time} · Sample date</small>`;
document.querySelector("#event-venue").innerHTML =
  `${event.venue}<br><small>Concept venue</small>`;
document.querySelector("#event-programme").innerHTML =
  `${event.programme.join("<br>")}<small>Sample programme; no performers announced.</small>`;
const header = document.querySelector(".site-header"),
  menu = document.querySelector(".menu-toggle");
menu.onclick = () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  header.classList.toggle("menu-open", open);
  menu.textContent = open ? "Close" : "Menu";
  menu.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
};
header.querySelectorAll("a, [data-book]").forEach((a) =>
  a.addEventListener("click", () => {
    menu.setAttribute("aria-expanded", "false");
    header.classList.remove("menu-open");
    menu.textContent = "Menu";
    menu.setAttribute("aria-label", "Open navigation");
  }),
);
const eventSection = document.querySelector("#event");
let eventBoundary = 0, paperHeader;
function updateHeader() {
  const paper = scrollY > eventBoundary;
  if (paper !== paperHeader) {
    paperHeader = paper;
    header.classList.toggle("on-paper", paper);
  }
}
function measureHeaderBoundary() {
  eventBoundary = eventSection.getBoundingClientRect().top + scrollY - 95;
  updateHeader();
}
measureHeaderBoundary();
window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("resize", measureHeaderBoundary, { passive: true });
ScrollTrigger.addEventListener("refresh", measureHeaderBoundary);
const credits = document.querySelector("#credits-dialog");
document.querySelector("#credits-open").onclick = () => credits.showModal();
credits.querySelector(".dialog-close").onclick = () => credits.close();
// Read-only diagnostics for local verification; no user data or payment details.
window.concertDiagnostics = () => journey?.stats()||{initializing:true};
