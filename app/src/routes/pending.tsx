import { createFileRoute } from "@tanstack/react-router";
import { PendingCard } from "../features/auth/components/PendingCard";

export const Route = createFileRoute("/pending")({
  component: () => (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <PendingCard />
    </div>
  ),
});
