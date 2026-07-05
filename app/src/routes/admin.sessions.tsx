import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/sessions")({
  component: AdminSessionsPage,
});

function AdminSessionsPage() {
  return <div>Admin — Sessions</div>;
}
