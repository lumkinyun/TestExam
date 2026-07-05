import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cases/$caseId")({
  component: CaseDetailPage,
});

function CaseDetailPage() {
  return <div>Case Detail</div>;
}
