import Link from "next/link";
import { SearchX } from "lucide-react";
export default function NotFound() {
  return (
    <main
      className="empty-state"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="empty-icon">
        <SearchX size={21} />
      </div>
      <p
        style={{
          fontSize: 12,
          letterSpacing: ".12em",
          textTransform: "uppercase",
        }}
      >
        404 · Page not found
      </p>
      <h1 style={{ margin: "0 0 8px", fontSize: 26 }}>This page isn’t here</h1>
      <p>The page may have moved, or the address may be incorrect.</p>
      <Link href="/dashboard" className="button button-primary">
        Return to dashboard
      </Link>
    </main>
  );
}
