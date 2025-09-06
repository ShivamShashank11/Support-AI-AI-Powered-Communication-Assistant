export function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleString();
}

export function safeGet(obj, path, fallback = null) {
  try {
    return path.split('.').reduce((s, p) => (s ? s[p] : undefined), obj) ?? fallback;
  } catch {
    return fallback;
  }
}
