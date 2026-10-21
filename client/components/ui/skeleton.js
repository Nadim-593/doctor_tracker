export function TableSkeleton({ columns = 5, rows = 5 }) {
  return <div aria-label="Loading records" aria-busy="true" className="table-scroll"><table><thead><tr>{Array.from({ length: columns }, (_, i) => <th key={i}><span className="skeleton skeleton-heading"/></th>)}</tr></thead><tbody>{Array.from({ length: rows }, (_, row) => <tr key={row}>{Array.from({ length: columns }, (_, col) => <td key={col}><span className="skeleton"/></td>)}</tr>)}</tbody></table></div>;
}

export function ChartSkeleton() {
  return <div className="chart-skeleton" aria-label="Loading analytics" aria-busy="true"><span className="skeleton"/><span className="skeleton"/><span className="skeleton"/></div>;
}
