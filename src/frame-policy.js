import { segments } from './data.js';

export const frameAt = (position) => Math.round(position.time * 24) + 1;
export const clampFrame = (clip, frame) => Math.max(1, Math.min(clip === 1 ? 480 : clip === 2 ? 240 : 192, Math.round(frame)));

// Predict the frame needed when an in-flight request finishes, without changing
// the scroll playhead or adding smoothing. Near frames follow the motion direction.
export function frameWindow(clip, frame, velocity, latency = 0.12) {
  const direction = Math.sign(velocity) || 1;
  const lead = Math.min(30, Math.round(Math.abs(velocity) * latency));
  const offsets = lead > 2
    ? [direction * lead, 0, direction * (lead + 3), direction * Math.max(1, lead - 3)]
    : [0, direction, direction * 2, -direction];
  for (let n = 3; n <= 12; n++) offsets.push(direction * (lead + n));
  for (let n = 1; n <= 4; n++) offsets.push(-direction * n);
  return [...new Set(offsets.map(offset => clampFrame(clip, frame + offset)))];
}

// Map a loaded frame back to its actual scene. Prefer the requested segment when
// it contains that frame, so intentional holds keep their original timing.
export function displayedPosition(position, frame) {
  const time = (frame - 1) / 24;
  if (time >= position.from - 1 / 24 && time <= position.to + 1 / 24) return position;
  const choices = segments.filter(s => s.clip === position.clip);
  const segment = choices.reduce((best, s) => {
    const distance = Math.max(s.from - time, 0, time - s.to);
    return !best || distance < best.distance ? { s, distance } : best;
  }, null)?.s;
  if (!segment) return position;
  const fraction = segment.to === segment.from ? 0 : Math.max(0, Math.min(1, (time - segment.from) / (segment.to - segment.from)));
  return { ...segment, time, progress: segment.start + fraction * segment.weight };
}

export function boundaryFrames(position) {
  const index = segments.findIndex(s => s.start === position.start);
  const result = [];
  for (const neighbour of [segments[index + 1], segments[index - 1]]) {
    if (!neighbour || neighbour.clip === position.clip) continue;
    result.push({ c: neighbour.clip, f: frameAt({time: neighbour.start > position.start ? neighbour.from : neighbour.to}) });
  }
  // The next segment can be a hold in the same clip. Find the actual next cut.
  const next = segments.slice(index + 1).find(s => s.clip !== position.clip);
  const previous = [...segments.slice(0, index)].reverse().find(s => s.clip !== position.clip);
  if (next) result.push({c: next.clip, f: frameAt({time: next.from})});
  if (previous) result.push({c: previous.clip, f: frameAt({time: previous.to})});
  return [...new Map(result.map(t => [`${t.c}/${t.f}`, t])).values()];
}
