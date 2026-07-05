import { createFileRoute } from "@tanstack/react-router";
import SessionsPage from "@/features/academics/components/SessionsPage";

export const Route = createFileRoute("/admin/sessions")({
  component: SessionsPage,
});

