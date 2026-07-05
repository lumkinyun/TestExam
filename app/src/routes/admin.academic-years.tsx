import { createFileRoute } from "@tanstack/react-router";
import AcademicYearsPage from "@/features/academics/components/AcademicYearsPage";

export const Route = createFileRoute("/admin/academic-years")({
  component: AcademicYearsPage,
});

