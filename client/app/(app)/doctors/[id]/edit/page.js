"use client";

import { useParams } from "next/navigation";
import { useRecord } from "@/hooks/use-records";
import PageHeading from "@/components/ui/page-heading";
import RecordForm from "@/components/ui/record-form";
import { QueryState } from "@/components/ui/states";
export default function EditDoctorPage() { const { id } = useParams(); const q = useRecord("doctors", id); const data = q.data?.data || q.data; return <div className="page-wrap"><PageHeading eyebrow="Care team / Doctors" title="Edit doctor"/>{q.isPending || q.isError ? <QueryState error={q.error} onRetry={() => q.refetch()}/> : <RecordForm type="doctor" recordId={id} initialValues={data}/>}</div>; }
