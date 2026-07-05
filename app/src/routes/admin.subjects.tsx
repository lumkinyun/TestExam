import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/subjects")({
  component: AdminSubjectsPage,
});

function AdminSubjectsPage() {
  return <div>Admin — Subjects</div>;
}
