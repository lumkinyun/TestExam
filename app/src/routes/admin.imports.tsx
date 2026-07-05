import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/imports")({
  component: AdminImportsPage,
});

function AdminImportsPage() {
  return <div>Admin — Imports</div>;
}
