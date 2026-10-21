"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Search, Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useRecords } from "@/hooks/use-records";
import { apiRequest } from "@/lib/api";
import { EmptyState, QueryState } from "@/components/ui/states";
import { TableSkeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/ui/confirm-dialog";

const configs = {
  doctors: { title: "Doctors", singular: "doctor", search: "Search name, specialization, hospital, phone, email", cols: ["Doctor", "Specialization", "Hospital", "Phone", "Actions"] },
  patients: { title: "Patients", singular: "patient", search: "Search name, phone, email, condition", cols: ["Patient", "Condition", "Doctor", "Contact", "Actions"] },
};

function initials(name = "") { return name.split(/\s+/).slice(0, 2).map(n => n[0] || "").join("").toUpperCase(); }

export default function RecordTable({ resource }) {
  const config = configs[resource];
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [actionError, setActionError] = useState("");
  const [recordToDelete, setRecordToDelete] = useState(null);
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const params = { q: debouncedSearch, ...filters, sort, order, page, limit: 10 };
  const query = useRecords(resource, params);
  const client = useQueryClient();
  const remove = useMutation({ mutationFn: id => apiRequest(`/${resource}/${encodeURIComponent(id)}`, { method: "DELETE" }), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: [resource] }), client.invalidateQueries({ queryKey: ["dashboard"] }), ...(resource === "patients" ? [client.invalidateQueries({ queryKey: ["doctors"] })] : [])]); }, onError: error => setActionError(error.message) });
  const filtersData = useRecords("doctors", { limit: 100, sort: "name", order: "asc" });
  const payload = query.data;
  const rows = Array.isArray(payload) ? payload : payload?.items || payload?.data || [];
  const pagination = payload?.pagination || {};
  const total = pagination.total ?? payload?.total ?? rows.length;
  const pages = pagination.totalPages ?? payload?.totalPages ?? Math.max(1, Math.ceil(total / 10));

  function setFilter(key, value) { setPage(1); setFilters(old => ({ ...old, [key]: value })); }
  function confirmDelete() { if (recordToDelete) remove.mutate(recordToDelete._id || recordToDelete.id, { onSuccess: () => setRecordToDelete(null) }); }

  return <>
    <div className="toolbar"><div className="input-wrap"><Search size={16}/><input aria-label={config.search} placeholder={config.search} value={search} onChange={e => setSearch(e.target.value)}/></div>
      {resource === "doctors" && <><input aria-label="Filter by specialization" className="field" style={{width:155}} placeholder="Specialization" value={filters.specialization || ""} onChange={e => setFilter("specialization", e.target.value)}/><input aria-label="Filter by hospital" className="field" style={{width:155}} placeholder="Hospital" value={filters.hospital || ""} onChange={e => setFilter("hospital", e.target.value)}/></>}
      {resource === "patients" && <><select aria-label="Filter by doctor" value={filters.doctor || ""} onChange={e => setFilter("doctor", e.target.value)}><option value="">All doctors</option>{(filtersData.data?.items || filtersData.data || []).map(d => <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>)}</select><input aria-label="Filter by condition" className="field" style={{width:145}} placeholder="Condition" value={filters.condition || ""} onChange={e => setFilter("condition", e.target.value)}/></>}
      <label className="muted" style={{fontSize:11}}>From <input aria-label="Created from" type="date" className="field" style={{width:145}} value={filters.createdFrom?.slice(0,10) || ""} onChange={e => setFilter("createdFrom", e.target.value ? new Date(`${e.target.value}T00:00:00.000Z`).toISOString() : "")}/></label><label className="muted" style={{fontSize:11}}>To <input aria-label="Created to" type="date" className="field" style={{width:145}} value={filters.createdTo?.slice(0,10) || ""} onChange={e => setFilter("createdTo", e.target.value ? new Date(`${e.target.value}T23:59:59.999Z`).toISOString() : "")}/></label>
      <select aria-label="Sort records by" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}><option value="createdAt">Recently added</option><option value="name">Name</option>{resource === "doctors" ? <><option value="specialization">Specialization</option><option value="hospital">Hospital</option><option value="email">Email</option></> : <><option value="condition">Condition</option><option value="dateOfBirth">Date of birth</option><option value="gender">Gender</option></>}</select><select aria-label="Sort direction" value={order} onChange={e => { setOrder(e.target.value); setPage(1); }}><option value="desc">Descending</option><option value="asc">Ascending</option></select>
      <Link href={`/${resource}/new`} className="button button-primary"><Plus size={16}/>Add {config.singular}</Link>
    </div>
    {actionError && <div className="alert" role="alert">{actionError}</div>}
    <div className="table-card">{query.isPending ? <TableSkeleton columns={config.cols.length}/> : query.isError ? <QueryState error={query.error} onRetry={() => query.refetch()}/> : rows.length === 0 ? <EmptyState title={search || Object.values(filters).some(Boolean) ? "No matching records" : `No ${resource} yet`} message={search || Object.values(filters).some(Boolean) ? "Try changing your search or filters." : `Create a ${config.singular} to get started. Records will appear here once saved to your connected API.`}/> : <>
      <div className="table-scroll"><table><thead><tr>{config.cols.map(col => <th key={col}>{col}</th>)}</tr></thead><tbody>{rows.map(record => <tr key={record._id || record.id}>
        {resource === "doctors" ? <><td><div className="person"><span className="person-avatar">{initials(record.name)}</span><span>{record.name}<br/><span className="muted" style={{fontSize:11,fontWeight:400}}>{record.email}</span></span></div></td><td>{record.specialization || "—"}</td><td>{record.hospital || "—"}</td><td>{record.phone || "—"} <span className="muted" style={{fontSize:10}}>· {record.patientCount ?? 0} patients</span></td></> : <><td><div className="person"><span className="person-avatar">{initials(record.name)}</span><span>{record.name}<br/><span className="muted" style={{fontSize:11,fontWeight:400}}>{record.email}</span></span></div></td><td>{record.condition || "—"}</td><td>{record.doctor?.name || "—"}</td><td>{record.phone || "—"}</td></>}
        <td><div className="row-actions"><Link className="button" href={`/${resource}/${record._id || record.id}`} aria-label={`View ${record.name}`} style={{padding:"6px 9px",fontSize:11}}>View</Link><Link className="icon-button" href={`/${resource}/${record._id || record.id}/edit`} aria-label={`Edit ${record.name}`} title="Edit"><Pencil size={16}/></Link><button className="icon-button" type="button" aria-label={`Delete ${record.name}`} title="Delete" onClick={() => setRecordToDelete(record)} disabled={remove.isPending}><Trash2 size={16}/></button></div></td>
      </tr>)}</tbody></table></div>
      <div className="pagination"><span>Showing {total ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, total)} of {total}</span><div className="page-buttons"><button className="page-button" type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={15}/></button><span className="page-button" aria-current="page">{page} / {pages}</span><button className="page-button" type="button" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={15}/></button></div></div>
    </>}</div>
    <ConfirmDialog open={Boolean(recordToDelete)} title={`Delete ${config.singular}?`} message={`Delete ${recordToDelete?.name || "this record"}? This action cannot be undone.`} pending={remove.isPending} onConfirm={confirmDelete} onClose={() => setRecordToDelete(null)}/>
  </>;
}
