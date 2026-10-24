// Today's date as YYYY-MM-DD. DEMO_DATE pins it so rehearsal numbers equal stage numbers.
export function today() {
  if (process.env.DEMO_DATE) return process.env.DEMO_DATE.slice(0, 10);
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
