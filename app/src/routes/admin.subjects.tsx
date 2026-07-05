import { createFileRoute } from "@tanstack/react-router";
import SubjectsPage from "@/features/academics/components/SubjectsPage";

export const Route = createFileRoute("/admin/subjects")({
  component: SubjectsPage,
});

