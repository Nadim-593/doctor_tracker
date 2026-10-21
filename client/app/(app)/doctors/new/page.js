import PageHeading from "@/components/ui/page-heading";
import RecordForm from "@/components/ui/record-form";
export default function NewDoctorPage() {
  return (
    <div className="page-wrap">
      <PageHeading eyebrow="Care team / Doctors" title="Add doctor" />
      <RecordForm type="doctor" />
    </div>
  );
}
