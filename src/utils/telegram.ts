/** Build a Telegram deep link from a username, @handle, t.me URL or phone number. */
export function telegramHref(contact: string): string {
  const trimmed = contact.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http')) return trimmed;

  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(withoutAt)) {
    return `https://t.me/${encodeURIComponent(withoutAt)}`;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (/^\+?[\d\s\-()]+$/.test(trimmed) && digits.length >= 8) {
    return `https://t.me/+${digits}`;
  }

  return `https://t.me/${encodeURIComponent(withoutAt)}`;
}
