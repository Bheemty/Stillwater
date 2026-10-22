import QRCode from "qrcode";
import { event, seats, seatById, zones, money, totals } from "./data";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const read = (k, f) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? f;
  } catch {
    return f;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
export function startBooking() {
  const dialog = document.querySelector("#booking-dialog"),
    content = document.querySelector("#booking-content"),
    bar = document.querySelector("#booking-bar");
  const savedSelection = read("stillwater-selection-v2", []);
  let selected = new Set(
      (Array.isArray(savedSelection) ? savedSelection : []).filter(
        (id) => seatById.get(id)?.status === "available",
      ),
    ),
    ticket = read("stillwater-ticket-v2", null),
    zone = "front",
    view = innerWidth < 700 ? "list" : "map",
    focused = null,
    step = "seats",
    attendee = { name: "", email: "" },
    tourZone = null,
    busy = false,
    returnFocus,
    renderedStep;
  if (
    ticket &&
    (!Array.isArray(ticket.seats) ||
      typeof ticket.name !== "string" ||
      !Number.isSafeInteger(ticket.total) ||
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(ticket.qr) ||
      !/^DEMO-SW-[A-Z0-9-]+$/.test(ticket.reference) ||
      !ticket.seats.every((id) => seatById.has(id)))
  )
    ticket = null;
  function announce(t) {
    document.querySelector("#announcement").textContent = t;
  }
  function sync() {
    write("stillwater-selection-v2", [...selected]);
    const t = totals(selected);
    bar.hidden = !t.selected.length;
    document.body.classList.toggle("has-selection", !!t.selected.length);
    document.querySelector("#bar-count").textContent =
      `${t.selected.length} ${t.selected.length === 1 ? "seat" : "seats"} selected`;
    document.querySelector("#bar-seats").textContent = t.selected
      .map((s) => s.id)
      .join(", ");
    document.querySelector("#bar-total").textContent = money(t.total);
    document.querySelector("#revisit-ticket").hidden = !ticket;
  }
  const status = (s) =>
    s.status === "unavailable"
      ? "Unavailable"
      : selected.has(s.id)
        ? "Selected"
        : "Available";
  function toggle(id) {
    const s = seatById.get(id);
    if (!s || s.status === "unavailable") return;
    selected.has(id) ? selected.delete(id) : selected.add(id);
    const previousStep = step;
    if (!selected.size && step !== "seats") step = "seats";
    sync();
    if (previousStep !== step) render();
    else updateSelection(id);
    updateDetails();
    announce(
      `${id} ${selected.has(id) ? "selected" : "removed"}. Total ${money(totals(selected).total)}.`,
    );
    const focusTarget =
      content.querySelector(`[data-seat="${id}"]`) ||
      content.querySelector("[data-remove]") ||
      content.querySelector('.zone-tabs [aria-pressed="true"], #back-seats');
    focusTarget?.focus({ preventScroll: true });
  }
  const summary = () => {
    const t = totals(selected);
    return `<aside class="selection-summary"><p class="eyebrow">Your evening</p><h3>${t.selected.length ? t.selected.length + " " + (t.selected.length === 1 ? "seat" : "seats") + " with your name on it." : "A place to call yours."}</h3><div class="selected-seats">${t.selected.length ? t.selected.map((s) => `<div><span><strong>${s.id}</strong> ${zones[s.zone].name} · ${s.block}</span><span>${money(s.price)} <button data-remove="${s.id}" aria-label="Remove seat ${s.id}">×</button></span></div>`).join("") : "<p>Choose a seat from any block.<br>Your selection stays with you as you explore.</p>"}</div><dl class="price-summary"><div><dt>Seats</dt><dd>${money(t.subtotal)}</dd></div><div><dt>Sample booking fee <small>${money(event.fee)} per seat</small></dt><dd>${money(t.fees)}</dd></div><div class="total-line"><dt>Total</dt><dd>${money(t.total)}</dd></div></dl><button class="dark-button wide" id="checkout-next" ${t.selected.length ? "" : "disabled"}>Continue to details <span aria-hidden="true">↗</span></button><p class="micro">Demo only. Nothing is reserved or charged.</p></aside>`;
  };
  function liveSummary() {
    const t = totals(selected);
    return `<strong>${t.selected.length} ${t.selected.length === 1 ? "seat" : "seats"} selected</strong><span>Booking total <strong>${money(t.total)}</strong> <small>including ${money(t.fees)} fees</small></span>`;
  }
  function updateSelection(id) {
    const s = seatById.get(id),
      b = content.querySelector(`[data-seat="${id}"]`);
    if (b && s) {
      b.classList.toggle("selected", selected.has(id));
      b.classList.toggle("available", !selected.has(id));
      b.setAttribute("aria-pressed", String(selected.has(id)));
      b.setAttribute(
        "aria-label",
        `Seat ${s.id}, row ${s.row}, ${zones[s.zone].name} zone, ${s.block} block, ${money(s.price)}, ${status(s)}`,
      );
      b.querySelector(".seat-icon").textContent = selected.has(id) ? "✓" : "○";
      const label = b.querySelector("small");
      if (label) label.textContent = status(s);
    }
    const summaryBox = content.querySelector(".selection-summary");
    if (summaryBox) summaryBox.outerHTML = summary();
    const live = content.querySelector("#booking-live");
    if (live) live.innerHTML = liveSummary();
    bindSummary();
  }
  function bindSummary() {
    content
      .querySelectorAll("[data-remove]")
      .forEach((b) => (b.onclick = () => toggle(b.dataset.remove)));
    const next = content.querySelector("#checkout-next");
    if (next && step !== "seats") next.hidden = true;
    if (next)
      next.onclick = () => {
        if (selected.size) {
          step = "details";
          render();
          document.querySelector("#attendee-name").focus();
        }
      };
  }
  function overview() {
    return `<div class="hall-overview" role="group" aria-label="Whole-hall overview, schematic"><div class="overview-caption"><strong>Whole-hall overview</strong><span>Stage ahead ↑</span></div><div class="overview-stage">STAGE</div><div class="overview-labels"><span>Zone</span><span>Left block</span><span>Aisle</span><span>Centre block</span><span>Aisle</span><span>Right block</span></div>${Object.entries(
      zones,
    )
      .map(
        ([k, z]) =>
          `<button class="overview-zone" data-zone="${k}" aria-label="View ${z.name} zone" ${zone === k ? 'aria-current="true"' : ""}><span>${z.name}</span><i></i><small>↕</small><i></i><small>↕</small><i></i></button>`,
      )
      .join(
        "",
      )}<p class="micro">Map view: ${zones[zone].name} zone${tourZone ? ` · Tour paused at ${zones[tourZone].name.toLowerCase()} zone` : ""}. Schematic orientation only; not a seat-for-seat match to the footage.</p></div>`;
  }
  function seatButton(s, list = false) {
    return `<button class="seat ${list ? "seat-list-item" : ""} ${status(s).toLowerCase()}" data-seat="${s.id}" aria-label="Seat ${s.id}, row ${s.row}, ${zones[s.zone].name} zone, ${s.block} block, ${money(s.price)}, ${status(s)}" aria-pressed="${selected.has(s.id)}" aria-disabled="${s.status === "unavailable"}" ${s.status === "unavailable" ? "disabled" : ""}><span class="seat-icon" aria-hidden="true">${s.status === "unavailable" ? "×" : selected.has(s.id) ? "✓" : "○"}</span><span>${list ? `${s.id} · ${s.block}` : s.number}</span>${list ? `<span>${money(s.price)} <small>${status(s)}</small></span>` : ""}</button>`;
  }
  function map() {
    const z = zones[zone];
    return `<div class="seat-map-head"><div><h3>${z.name} rows</h3><p>${z.description}</p></div><span>${money(z.price)} / seat</span></div><div class="view-switch" aria-label="Seat display"><button data-view="map" aria-pressed="${view === "map"}">Seat map</button><button data-view="list" aria-pressed="${view === "list"}">Accessible list</button></div>${
      view === "map"
        ? `<p class="micro map-guidance">Select multiple seats. Tap a selected seat to remove it.</p><div class="map-scroll" tabindex="0" aria-label="Seat map, scroll horizontally on narrow screens"><div class="seat-map"><div class="stage-arc">Stage</div><div class="block-labels"><span>Left</span><span>Centre</span><span>Right</span></div>${z.rows
            .map(
              (row) =>
                `<div class="seat-row"><span class="row-label">${row}</span>${seats
                  .filter((s) => s.row === row)
                  .map((s) => seatButton(s))
                  .join("")}<span class="row-label">${row}</span></div>`,
            )
            .join(
              "",
            )}<div class="map-orientation">Rear of the hall</div></div></div>`
        : `<div class="seat-accessible-list">${z.rows
            .map(
              (row) =>
                `<fieldset><legend>Row ${row}</legend>${seats
                  .filter((s) => s.row === row)
                  .map((s) => seatButton(s, true))
                  .join("")}</fieldset>`,
            )
            .join("")}</div>`
    }<div class="seat-detail" id="seat-detail" aria-live="polite"></div>`;
  }
  function updateDetails() {
    const box = document.querySelector("#seat-detail");
    if (!box) return;
    const s = seatById.get(focused);
    if (!s) {
      box.innerHTML =
        "<div><strong>Find the seat that feels right.</strong><p>Hover or focus for details. Tap to select or remove.</p></div>";
      return;
    }
    box.innerHTML = `<div><strong>Seat ${s.id}</strong><p>Row ${s.row} · ${zones[s.zone].name} zone · ${s.block} block</p><small>${status(s)} · ${money(s.price)} + ${money(event.fee)} sample fee</small></div>`;
  }
  function inspect(id) {
    if (focused === id) return;
    focused = id;
    updateDetails();
    document
      .querySelectorAll("[data-seat]")
      .forEach((b) => b.classList.toggle("inspected", b.dataset.seat === id));
  }
  function render() {
    if (renderedStep !== step) {
      content.scrollTop = 0;
      renderedStep = step;
    }
    const t = totals(selected);
    if (step === "ticket") {
      renderTicket();
      return;
    }
    content.innerHTML = `<div class="booking-heading"><p class="eyebrow">${event.name} · Demo booking</p><h2 id="booking-title">${step === "seats" ? "Find your place." : step === "details" ? "Make it your evening." : "One last look."}</h2><p>${step === "seats" ? "Select multiple seats. Tap a selected seat to remove it." : step === "details" ? "Use sample details. No information is sent anywhere." : "A simulated payment. A little piece of anticipation."}</p></div><div class="booking-live" id="booking-live" role="status" aria-live="polite" aria-atomic="true">${liveSummary()}</div><div class="booking-steps" aria-label="Booking steps"><span ${step === "seats" ? 'aria-current="step"' : ""}>1. Your seats</span><span ${step === "details" ? 'aria-current="step"' : ""}>2. Your details</span><span ${step === "payment" ? 'aria-current="step"' : ""}>3. Demo payment</span></div><div class="booking-layout">${
      step === "seats"
        ? `<div class="seat-workspace"><div class="zone-tabs" role="group" aria-label="Seating zones">${Object.entries(
            zones,
          )
            .map(
              ([k, z]) =>
                `<button data-zone="${k}" aria-pressed="${zone === k}">${z.name}<small>${money(z.price)}</small></button>`,
            )
            .join(
              "",
            )}</div>${overview()}<div class="legend"><span>○ Available</span><span>× Unavailable</span><span>✓ Selected</span></div>${map()}<p class="micro">Demo selection — selected rows only. These 72 sample seats are a bookable subset, not the hall’s capacity.</p><button class="text-button resume-tour">Continue exploring the venue</button></div>`
        : step === "details"
          ? `<div class="details-panel"><button class="text-button" id="back-seats">← Back to seats</button><form id="attendee-form" novalidate><label for="attendee-name">Attendee name</label><input id="attendee-name" name="name" autocomplete="name" maxlength="80" value="${escape(attendee.name)}" placeholder="e.g. Alex Morgan" aria-describedby="name-error" required><p class="field-error" id="name-error"></p><label for="attendee-email">Email address</label><input id="attendee-email" name="email" type="email" autocomplete="email" maxlength="160" value="${escape(attendee.email)}" placeholder="alex@example.com" aria-describedby="email-error" required><p class="field-error" id="email-error"></p><p class="micro">Email is used for this on-screen demo only. No email is sent or saved.</p><button class="dark-button wide" type="submit">Review demo payment <span aria-hidden="true">↗</span></button></form></div>`
          : `<div class="details-panel"><button class="text-button" id="back-details">← Back to details</button><h3>Ready when you are.</h3><p class="attendee-review">${escape(attendee.name)}<br><small>${escape(attendee.email)}</small></p><div class="demo-payment"><span aria-hidden="true">◇</span><div><strong>Demo payment</strong><p>No card details. No charge.<br>This creates a sample digital ticket.</p></div></div><button class="dark-button wide" id="pay-demo" ${busy ? "disabled" : ""}>${busy ? "Creating your demo ticket…" : `Complete demo booking · ${money(t.total)}`}</button><p class="micro">Demo ticket — not valid for entry.</p><p class="field-error" id="payment-error" role="alert"></p></div>`
    }${summary()}</div>`;
    content.querySelectorAll("[data-zone]").forEach(
      (b) =>
        (b.onclick = () => {
          zone = b.dataset.zone;
          focused = null;
          render();
          content
            .querySelector(`.zone-tabs [data-zone="${zone}"]`)
            .focus({ preventScroll: true });
        }),
    );
    content.querySelectorAll("[data-view]").forEach(
      (b) =>
        (b.onclick = () => {
          view = b.dataset.view;
          render();
          document.querySelector(`[data-view="${view}"]`).focus();
        }),
    );
    content.querySelectorAll("[data-seat]").forEach((b) => {
      b.onpointerenter = () => inspect(b.dataset.seat);
      b.onfocus = () => inspect(b.dataset.seat);
      b.onclick = () => {
        inspect(b.dataset.seat);
        toggle(b.dataset.seat);
      };
      // Native buttons provide Enter/Space activation exactly once.
    });
    bindSummary();
    content.querySelector(".resume-tour")?.addEventListener("click", close);
    content.querySelector("#back-seats")?.addEventListener("click", () => {
      step = "seats";
      render();
    });
    content.querySelector("#back-details")?.addEventListener("click", () => {
      step = "details";
      render();
    });
    const form = content.querySelector("#attendee-form");
    if (form)
      form.onsubmit = (e) => {
        e.preventDefault();
        attendee = {
          name: form.elements.name.value.trim(),
          email: form.elements.email.value.trim(),
        };
        const errors = {
          name:
            attendee.name.length < 2
              ? "Enter an attendee name (at least 2 characters)."
              : "",
          email: !/^\S+@\S+\.\S+$/.test(attendee.email)
            ? "Enter a valid email address, such as alex@example.com."
            : "",
        };
        for (const k of ["name", "email"]) {
          document.querySelector(`#${k}-error`).textContent = errors[k];
          form.elements[k].setAttribute("aria-invalid", String(!!errors[k]));
        }
        if (errors.name || errors.email) {
          form.elements[errors.name ? "name" : "email"].focus();
          return;
        }
        step = "payment";
        render();
        document.querySelector("#pay-demo").focus();
      };
    content.querySelector("#pay-demo")?.addEventListener("click", pay);
    updateDetails();
    if (step !== "seats")
      content.querySelector(".selection-summary #checkout-next").hidden = true;
  }
  async function pay() {
    if (busy || !totals(selected).selected.length) return;
    busy = true;
    render();
    try {
      const reference = `DEMO-SW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const qr = await QRCode.toDataURL(reference, {
        width: 240,
        margin: 2,
        color: { dark: "#252923", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      ticket = {
        reference,
        name: attendee.name,
        seats: [...selected],
        total: totals(selected).total,
        qr,
        created: new Date().toISOString(),
      };
      write("stillwater-ticket-v2", ticket);
      step = "ticket";
      attendee.email = "";
      sync();
      renderTicket();
      announce("Demo booking confirmed. Your ticket is ready.");
    } catch {
      busy = false;
      render();
      document.querySelector("#payment-error").textContent =
        "The ticket could not be created. Please try again.";
    } finally {
      busy = false;
    }
  }
  function renderTicket() {
    content.scrollTop = 0;
    content.innerHTML = `<div class="booking-heading confirmation-heading"><p class="eyebrow">You’re all set, for the demo.</p><h2 id="booking-title">See you in the moment.</h2><p>Your sample ticket is ready. No payment was taken.</p></div><article id="digital-ticket" class="digital-ticket"><div class="ticket-main"><div class="ticket-brand">Ⅲ &nbsp; Stillwater Hall</div><p>${escape(event.name)}</p><h3>A night<br>to keep.</h3><dl><div><dt>Attendee</dt><dd>${escape(ticket.name)}</dd></div><div><dt>When</dt><dd>${event.date}<br>${event.time} · Doors ${event.doors}</dd></div><div><dt>Where</dt><dd>${event.venue} · Concept venue</dd></div><div><dt>Your seats · ${ticket.seats.length} ${ticket.seats.length === 1 ? "ticket" : "tickets"}</dt><dd>${ticket.seats.map(escape).join(" · ")}</dd></div></dl></div><div class="ticket-stub"><span>Admit ${ticket.seats.length}</span><img src="${ticket.qr}" width="160" height="160" alt="QR code containing only demo reference ${escape(ticket.reference)}"><code>${escape(ticket.reference)}</code><strong>Demo ticket<br>not valid for entry</strong><small>Sample total ${money(ticket.total)}</small></div></article><div class="ticket-actions"><button class="dark-button" id="print-ticket">Print / save as PDF</button><button class="outline-button" id="download-ticket">Download ticket</button><button class="text-button resume-tour">Back to the evening</button></div><p class="micro ticket-privacy">This demo ticket is saved in this browser. Its QR code contains only a demo reference.</p>`;
    document.querySelector("#print-ticket").onclick = () => window.print();
    document.querySelector("#download-ticket").onclick = downloadTicket;
    document.querySelector(".resume-tour").onclick = close;
  }
  function downloadTicket() {
    const lines = [];
    for (let i = 0; i < ticket.seats.length; i += 10)
      lines.push(ticket.seats.slice(i, i + 10).join(" · "));
    const height = Math.max(610, 530 + lines.length * 28);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}"><rect width="1000" height="${height}" fill="#f3f0e7"/><rect width="1000" height="12" fill="#672e3b"/><g fill="#252923" font-family="Georgia,serif"><text x="50" y="70" font-size="26">Stillwater Hall</text><text x="50" y="140" font-size="55">${escape(event.name)}</text><text x="50" y="210" font-size="24" ${ticket.name.length > 42 ? 'textLength="640" lengthAdjust="spacingAndGlyphs"' : ""}>${escape(ticket.name)}</text><text x="50" y="265" font-size="21">${escape(event.date)} · ${escape(event.time)}</text><text x="50" y="310" font-size="21">${escape(event.venue)} · Concept venue</text><text x="50" y="355" font-size="18">${ticket.seats.length} tickets · Selected seats</text>${lines.map((line, i) => `<text x="50" y="${390 + i * 28}" font-size="19">${escape(line)}</text>`).join("")}<text x="50" y="${height - 115}" font-size="18">${escape(ticket.reference)} · Sample total ${money(ticket.total)}</text><text x="50" y="${height - 55}" font-size="22" font-weight="bold">Demo ticket — not valid for entry</text></g><image href="${ticket.qr}" x="740" y="175" width="210" height="210"/></svg>`;
    const u = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })),
      a = document.createElement("a");
    a.href = u;
    a.download = `${ticket.reference}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  function open(initialZone) {
    returnFocus = document.activeElement;
    if (initialZone && zones[initialZone]) zone = initialZone;
    step = "seats";
    render();
    dialog.showModal();
    document.body.classList.add("modal-open");
    dialog.querySelector(".dialog-close").focus();
  }
  function close() {
    dialog.close();
    document.body.classList.remove("modal-open");
    returnFocus?.focus({ preventScroll: true });
  }
  dialog.querySelector(".dialog-close").onclick = close;
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        close();
    }
  });
  document.querySelector("#revisit-ticket").onclick = () => {
    returnFocus = document.activeElement;
    step = "ticket";
    render();
    dialog.showModal();
    document.body.classList.add("modal-open");
  };
  document.querySelector("#reset-demo").onclick = () => {
    selected.clear();
    ticket = null;
    attendee = { name: "", email: "" };
    write("stillwater-ticket-v2", null);
    sync();
    document.querySelector("#credits-dialog").close();
    announce("Sample seats and demo ticket reset.");
  };
  sync();
  return {
    open,
    setTourZone(value) {
      tourZone = zones[value] ? value : null;
    },
  };
}
