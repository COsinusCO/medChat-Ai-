/** Small formatting helpers shared by the screens. */

/** `Шохрух Ибрагимов` → `ШИ`; a single name yields one letter. */
export function getInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0);
  const last = (lastName.trim() || firstName.trim().split(/\s+/)[1] || '').charAt(0);

  return `${first}${last}`.toUpperCase() || '?';
}
