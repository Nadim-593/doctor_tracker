"use client";

import { useParams } from "next/navigation";
import { useRecord } from "@/hooks/use-records";
import PageHeading from "@/components/ui/page-heading";
import RecordForm from "@/components/ui/record-form";
import { QueryState } from "@/components/ui/states";
export default function EditPatientPage() {
  const { id } = useParams();
  const q = useRecord("patients", id);
  const data = q.data?.data || q.data;
  return (
    <div className="page-wrap">
      <PageHeading eyebrow="Patients" title="Edit patient" />
      {q.isPending || q.isError ? (
        <QueryState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <RecordForm type="patient" recordId={id} initialValues={data} />
      )}
    </div>
  );
}
