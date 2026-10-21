import DetailView from "@/components/ui/detail-view";
export default function PatientDetailsPage() {
  return (
    <div className="page-wrap">
      <DetailView resource="patients" />
    </div>
  );
}
