import PageHeading from "@/components/ui/page-heading";
import RecordTable from "@/components/ui/record-table";
export default function DoctorsPage() {
  return (
    <div className="page-wrap">
      <PageHeading eyebrow="Care team" title="Doctors" />
      <RecordTable resource="doctors" />
    </div>
  );
}
