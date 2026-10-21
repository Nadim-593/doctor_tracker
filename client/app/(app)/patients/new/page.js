import PageHeading from "@/components/ui/page-heading";
import RecordForm from "@/components/ui/record-form";
export default function NewPatientPage() {
  return (
    <div className="page-wrap">
      <PageHeading eyebrow="Patients" title="Add patient" />
      <RecordForm type="patient" />
    </div>
  );
}
