import { AlertCircle, LoaderCircle, SearchX } from "lucide-react";

export function QueryState({ error, onRetry }) {
  if (error) return <div className="empty-state" role="alert"><div className="empty-icon"><AlertCircle size={20}/></div><h3>We couldn’t load this data</h3><p>{error.message}</p><button className="button" onClick={onRetry} type="button">Try again</button></div>;
  return <div className="empty-state" aria-label="Loading"><LoaderCircle size={22} className="animate-spin"/><p>Loading…</p></div>;
}

export function EmptyState({ title = "No records found", message = "Try changing your search or filters." }) {
  return <div className="empty-state"><div className="empty-icon"><SearchX size={20}/></div><h3>{title}</h3><p>{message}</p></div>;
}
