import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/academic-years")({
  component: AdminAcademicYearsPage,
});

function AdminAcademicYearsPage() {
  return <div>Admin — Academic Years</div>;
}
