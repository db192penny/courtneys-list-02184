export function formatUSPhoneDisplay(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  // If it looks like an email or contains non-phone indicators, return as-is
  if (/[a-zA-Z@]/.test(trimmed)) return trimmed;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6);
    return `(${area}) ${prefix}-${line}`;
  }
  // If it is already in E.164 like +1XXXXXXXXXX, try to pretty print
  if (/^\+1\d{10}$/.test(trimmed)) {
    const d = trimmed.slice(2);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  return trimmed;
}
