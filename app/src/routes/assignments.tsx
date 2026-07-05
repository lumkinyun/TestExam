import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/assignments")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  return <div>Assignments</div>;
}
