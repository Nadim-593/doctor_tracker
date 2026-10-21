export default function PageHeading({ eyebrow, title, children }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{children && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{children}</div>}</div>;
}
