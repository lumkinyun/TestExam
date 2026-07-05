import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/gmail")({
  component: AdminGmailPage,
});

function AdminGmailPage() {
  return <div>Admin — Gmail</div>;
}
