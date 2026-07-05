import React from "react";
import { useConvexAuth } from "convex/react";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const { user, isLoading: isUserLoading } = useCurrentUser();

  if (isAuthLoading || (isAuthenticated && isUserLoading)) {
    return (
      fallback || (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-300">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading session...</p>
          </div>
        </div>
      )
    );
  }

  if (!isAuthenticated || !user || !user.isActive) {
    return null;
  }

  return <>{children}</>;
}
