import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthGuard } from "./AuthGuard";
import { useConvexAuth } from "convex/react";
import { useCurrentUser } from "../hooks/useCurrentUser";

// Mock the hooks
vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
}));

vi.mock("../hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

describe("AuthGuard Component", () => {
  it("renders loading state when auth or user is loading", () => {
    vi.mocked(useConvexAuth).mockReturnValue({ isLoading: true, isAuthenticated: false } as any);
    vi.mocked(useCurrentUser).mockReturnValue({ user: undefined, isLoading: true } as any);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText("Loading session...")).toBeDefined();
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders nothing when user is unauthenticated", () => {
    vi.mocked(useConvexAuth).mockReturnValue({ isLoading: false, isAuthenticated: false } as any);
    vi.mocked(useCurrentUser).mockReturnValue({ user: null, isLoading: false } as any);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders nothing when user is authenticated but inactive (disabled)", () => {
    vi.mocked(useConvexAuth).mockReturnValue({ isLoading: false, isAuthenticated: true } as any);
    vi.mocked(useCurrentUser).mockReturnValue({
      user: { normalizedEmail: "user@tarc.edu.my", isActive: false, isAdmin: false },
      isLoading: false,
    } as any);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders children when user is authenticated and active", () => {
    vi.mocked(useConvexAuth).mockReturnValue({ isLoading: false, isAuthenticated: true } as any);
    vi.mocked(useCurrentUser).mockReturnValue({
      user: { normalizedEmail: "user@tarc.edu.my", isActive: true, isAdmin: false },
      isLoading: false,
    } as any);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText("Protected Content")).toBeDefined();
  });
});
