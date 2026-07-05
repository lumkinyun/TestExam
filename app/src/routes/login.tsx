import { createFileRoute } from "@tanstack/react-router";
import { LoginCard } from "../features/auth/components/LoginCard";

export const Route = createFileRoute("/login")({
  component: () => (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <LoginCard />
    </div>
  ),
});
