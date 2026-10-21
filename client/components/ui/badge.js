export default function Badge({ children, tone = "teal" }) {
  return <span className={`badge ${tone === "neutral" ? "badge-neutral" : tone === "warning" ? "badge-warn" : ""}`}>{children}</span>;
}
