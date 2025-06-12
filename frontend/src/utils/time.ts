export function formatMs(ms: number) {
  const secs = Math.max(0, Math.round(ms / 1000));
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}
