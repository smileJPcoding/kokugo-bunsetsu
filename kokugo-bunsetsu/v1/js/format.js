export function formatBigNumber(value) {
  const n = Math.floor(value);
  if (n < 10000) return String(n);
  if (n < 100000000) return `${(n / 10000).toFixed(1)}万`;
  return `${(n / 100000000).toFixed(2)}億`;
}
