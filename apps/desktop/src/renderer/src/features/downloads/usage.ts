/** Share of the limit that is used (0–100) and whether it is reached; no limit, no share. */
export function usageShare(usedBytes: number, limitBytes: number | null): { percent: number; over: boolean } {
  if (limitBytes === null || limitBytes <= 0) return { percent: 0, over: false };
  const percent = Math.min(100, (usedBytes / limitBytes) * 100);
  return { percent, over: usedBytes >= limitBytes };
}
