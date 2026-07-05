import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/printing")({
  component: PrintingPage,
});

function PrintingPage() {
  return <div>Printing</div>;
}
