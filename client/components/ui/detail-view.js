"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRecord, useRecords } from "@/hooks/use-records";
import PageHeading from "@/components/ui/page-heading";
import { QueryState } from "@/components/ui/states";

export default function DetailView({ resource }) {
  const params = useParams();
  const id = params.id;
  const { data, isPending, isError, error, refetch } = useRecord(resource, id);
  const doctorPatients = useRecords(`doctors/${id}/patients`, { page: 1, limit: 10, sort: "createdAt", order: "desc" }, resource === "doctors");
  if (isPending || isError) return <div className="page-wrap"><QueryState error={error} onRetry={refetch}/></div>;
  const record = data?.data || data;
  const doctor = resource === "doctors";
  const entries = doctor ? [["Email", record.email], ["Phone", record.phone], ["Specialization", record.specialization], ["Hospital", record.hospital], ["Patients", record.patientCount]] : [["Email", record.email], ["Phone", record.phone], ["Date of birth", record.dateOfBirth ? new Date(record.dateOfBirth).toLocaleDateString() : ""], ["Gender", record.gender], ["Primary condition", record.condition], ["Assigned doctor", record.doctor?.name || record.doctorName], ["Care notes", record.notes]];
  const title = doctor ? "Doctor details" : "Patient details";
  return <div className="page-wrap"><PageHeading eyebrow="Record" title={record.name || title}><Link className="button" href={`/${resource}`}>Back to {resource}</Link><Link className="button button-primary" href={`/${resource}/${id}/edit`}>Edit record</Link></PageHeading><div className="detail-grid"><section className="panel"><h2>{title}</h2><p className="panel-subtitle">Record ID · {id}</p>{entries.map(([label, value]) => <div className="detail-row" key={label}><span>{label}</span><strong style={{fontWeight:550,textAlign:"right"}}>{value || "—"}</strong></div>)}</section>{doctor && <section className="panel"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><h2>Assigned patients</h2><p className="panel-subtitle">Patients managed by this doctor</p></div><Link className="button button-primary" href={`/patients/new?doctor=${encodeURIComponent(id)}`}>Add patient</Link></div>{doctorPatients.isPending ? <p className="muted">Loading patients…</p> : doctorPatients.isError ? <p className="muted" role="alert">{doctorPatients.error.message}</p> : (doctorPatients.data?.items || []).length === 0 ? <p className="muted">No patients are assigned to this doctor.</p> : (doctorPatients.data.items).map(patient => <div className="detail-row" key={patient._id}><Link href={`/patients/${patient._id}`}><strong>{patient.name}</strong></Link><span>{patient.condition || "—"}</span></div>)}</section>}</div></div>;
}
