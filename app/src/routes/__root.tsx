import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useEffect } from "react";
import { useCurrentUser } from "../features/auth/hooks/useCurrentUser";

function RootComponent() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-300">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading session...</p>
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <AuthUnauthenticatedBoundary />
      </Unauthenticated>
      <Authenticated>
        <AuthAuthenticatedBoundary />
      </Authenticated>
    </>
  );
}

function AuthUnauthenticatedBoundary() {
  const navigate = useNavigate();
  const state = useRouterState();

  useEffect(() => {
    if (state.location.pathname !== "/login") {
      navigate({ to: "/login" });
    }
  }, [state.location.pathname, navigate]);

  return <Outlet />;
}

function AuthAuthenticatedBoundary() {
  const { user, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const state = useRouterState();

  useEffect(() => {
    if (isLoading || !user) return;

    if (!user.isActive) {
      if (state.location.pathname !== "/pending") {
        navigate({ to: "/pending" });
      }
    } else {
      if (state.location.pathname === "/login" || state.location.pathname === "/pending") {
        navigate({ to: "/" });
      }
    }
  }, [user, isLoading, state.location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Checking profile...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export const Route = createRootRoute({
  component: RootComponent,
});
