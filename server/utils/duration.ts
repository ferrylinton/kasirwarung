// Helper: parse human expiration string into seconds (e.g. '15m' -> 900, '1d' -> 86400)
export function parseDurationToSeconds(durationStr: string, defaultSec: number): number {
  if (!durationStr) return defaultSec;
  const match = durationStr.toString().trim().match(/^(\d+)\s*(s|m|h|d|w)?$/i);
  if (!match) return defaultSec;
  const num = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 's': return num;
    case 'm': return num * 60;
    case 'h': return num * 3600;
    case 'd': return num * 86400;
    case 'w': return num * 86400 * 7;
    default: return defaultSec;
  }
}
