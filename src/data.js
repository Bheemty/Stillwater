export const event = {
  name: "Stillwater Sessions",
  date: "Saturday, 12 December 2026",
  time: "19:30",
  doors: "18:30",
  venue: "Stillwater Hall",
  currency: "GBP",
  programme: [
    "An acoustic opening.",
    "A live ensemble.",
    "A closing set to remember.",
  ],
  fee: 200,
};
const wholeMoney = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: event.currency,
  maximumFractionDigits: 0,
});
const fractionalMoney = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: event.currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const money = (p) =>
  (p % 100 ? fractionalMoney : wholeMoney).format(p / 100);
export const zones = {
  front: {
    name: "Front",
    price: 8500,
    rows: ["A", "B", "C"],
    description: "Close to the first note.",
  },
  middle: {
    name: "Middle",
    price: 6500,
    rows: ["D", "E", "F"],
    description: "Right in the heart of it.",
  },
  rear: {
    name: "Rear",
    price: 4500,
    rows: ["G", "H", "I"],
    description: "Take in the whole room.",
  },
};
export const seats = Object.entries(zones).flatMap(([zone, v]) =>
  v.rows.flatMap((row) =>
    Array.from({ length: 8 }, (_, i) => ({
      id: `${row}${String(i + 1).padStart(2, "0")}`,
      row,
      number: i + 1,
      zone,
      block: i < 2 ? "Left" : i < 6 ? "Centre" : "Right",
      price: v.price,
      status:
        (row.charCodeAt(0) * 3 + i) % 11 === 0 ? "unavailable" : "available",
    })),
  ),
);
export const seatById = new Map(seats.map((s) => [s.id, s]));
export const segments = [
  { clip: 1, from: 0, to: 12, weight: 1.4, scene: "arrival" },
  { clip: 1, from: 12, to: 19.958, weight: 1.4, scene: "lobby" },
  { clip: 2, from: 0, to: 9.958, weight: 1.7, scene: "auditorium" },
  { clip: 3, from: 0, to: 7.958, weight: 1.3, scene: "stage" },
  { clip: 3, from: 7.958, to: 7.958, weight: 0.45, scene: "stage" },
  // The 6.25s turn frame matches clip 5's 0.125s opening; its late pan does not.
  { clip: 4, from: 0, to: 6.25, weight: 1.1, scene: "turn" },
  { clip: 4, from: 6.25, to: 6.25, weight: 0.65, scene: "front" },
  { clip: 5, from: 0.125, to: 2.6, weight: 0.65, scene: "front" },
  { clip: 5, from: 2.6, to: 2.6, weight: 0.6, scene: "front" },
  { clip: 5, from: 2.6, to: 7.958, weight: 0.9, scene: "middle" },
  { clip: 5, from: 7.958, to: 7.958, weight: 0.6, scene: "middle" },
  { clip: 6, from: 0, to: 7.958, weight: 1.1, scene: "rear" },
  { clip: 6, from: 7.958, to: 7.958, weight: 0.8, scene: "rear" },
];
let offset = 0;
for (const s of segments) {
  s.start = offset;
  offset += s.weight;
  s.end = offset;
}
export const journeyLength = offset;
export const chapters = [
  { key: "arrival", name: "The arrival", progress: 0 },
  { key: "lobby", name: "Inside Stillwater", progress: 1.4 },
  { key: "stage", name: "The stage", progress: 5.95 },
  { key: "front", name: "Front seats", progress: segments[8].start + 0.3 },
  { key: "middle", name: "Middle seats", progress: segments[10].start + 0.3 },
  { key: "rear", name: "Rear seats", progress: segments[12].start + 0.4 },
];
export function locate(p) {
  const s = segments.find((s) => p < s.end) || segments.at(-1);
  const t = Math.max(0, Math.min(1, (p - s.start) / s.weight));
  return { ...s, time: s.from + (s.to - s.from) * t };
}
export function totals(ids) {
  const selected = [...ids]
    .map((id) => seatById.get(id))
    .filter((s) => s?.status === "available");
  const subtotal = selected.reduce((n, s) => n + s.price, 0);
  return {
    selected,
    subtotal,
    fees: selected.length * event.fee,
    total: subtotal + selected.length * event.fee,
  };
}
