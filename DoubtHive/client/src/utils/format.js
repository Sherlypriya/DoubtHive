export function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

// "just now", "5m ago", "3h ago", "2d ago", then a plain date
export function timeAgo(dateInput) {
  const then = new Date(dateInput).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateInput).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined,
  });
}
