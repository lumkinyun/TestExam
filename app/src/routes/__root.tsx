import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useEffect } from "react";
import { useCurrentUser } from "../features/auth/hooks/useCurrentUser";
import { LoadingScreen } from "../components/shared/LoadingScreen";
import { AppLayout } from "../features/shell/components/AppLayout";

function RootComponent() {
  return (
    <>
      <AuthLoading>
        <LoadingScreen message="Loading session..." />
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

  if (state.location.pathname !== "/login") {
    return null;
  }

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
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, isLoading, state.location.pathname, navigate]);

  if (isLoading || !user) {
    return <LoadingScreen message="Checking profile..." />;
  }

  // Pending users: only render the /pending route (no shell)
  if (!user.isActive) {
    if (state.location.pathname !== "/pending") {
      return null;
    }
    return <Outlet />;
  }

  // Active users: login/pending should redirect, so render nothing until navigation fires
  if (state.location.pathname === "/login" || state.location.pathname === "/pending") {
    return null;
  }

  // Active users: render inside shell layout
  return <AppLayout />;
}

export const Route = createRootRoute({
  component: RootComponent,
});
