import PageHeading from "@/components/ui/page-heading";
import RecordTable from "@/components/ui/record-table";
export default function PatientsPage() {
  return (
    <div className="page-wrap">
      <PageHeading eyebrow="People in your care" title="Patients" />
      <RecordTable resource="patients" />
    </div>
  );
}
