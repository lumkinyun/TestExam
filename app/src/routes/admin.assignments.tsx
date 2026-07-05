import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/assignments")({
  component: AdminAssignmentsPage,
});

function AdminAssignmentsPage() {
  return <div>Admin — Assignments</div>;
}
