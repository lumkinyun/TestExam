import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppSidebar } from "./AppSidebar";
import { useCurrentUser } from "../../auth/hooks/useCurrentUser";

// Mock TanStack Router so <Link> renders without a real router context
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => (
    <a data-testid="router-link" data-to={to} {...rest}>
      {children}
    </a>
  ),
  useRouterState: vi.fn(() => ({
    location: { pathname: "/dashboard" },
  })),
}));

// Mock shadcn sidebar — it requires real DOM APIs; replace with a passthrough
vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => (
    <nav data-testid="sidebar">{children}</nav>
  ),
  SidebarContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <ul>{children}</ul>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <li>{children}</li>
  ),
  SidebarMenuButton: ({
    children,
    render,
    isActive: _isActive,
    ...rest
  }: {
    children?: React.ReactNode;
    render?: React.ReactNode;
    isActive?: boolean;
    [key: string]: unknown;
  }) => <div {...rest}>{render ?? children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarTrigger: () => <button />,
  useSidebar: vi.fn(() => ({
    open: true,
    toggleSidebar: vi.fn(),
    isMobile: false,
    state: "expanded",
    openMobile: false,
    setOpen: vi.fn(),
    setOpenMobile: vi.fn(),
  })),
}));

vi.mock("../../auth/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

type MockUser = {
  isActive: boolean;
  isAdmin: boolean;
  isPrintingStaff: boolean;
  name?: string;
  email?: string;
};

function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    isActive: true,
    isAdmin: false,
    isPrintingStaff: false,
    name: "Test User",
    email: "test@tarc.edu.my",
    ...overrides,
  };
}

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders no application navigation for a disabled/pending user", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: mockUser({ isActive: false }) as any,
      isLoading: false,
    });

    render(<AppSidebar />);

    // Should not render any nav links
    expect(screen.queryByText("Dashboard")).toBeNull();
    expect(screen.queryByText("Assignments")).toBeNull();
    expect(screen.queryByText("Administration")).toBeNull();
  });

  it("renders Dashboard and Assignments for a normal active user", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: mockUser({ isActive: true, isAdmin: false, isPrintingStaff: false }) as any,
      isLoading: false,
    });

    render(<AppSidebar />);

    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Assignments")).toBeDefined();
    // No admin group
    expect(screen.queryByText("Administration")).toBeNull();
    // No printing link
    expect(screen.queryByText("Printing")).toBeNull();
  });

  it("renders Printing link for printing staff", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: mockUser({ isActive: true, isAdmin: false, isPrintingStaff: true }) as any,
      isLoading: false,
    });

    render(<AppSidebar />);

    expect(screen.getByText("Printing")).toBeDefined();
  });

  it("renders the Administration group for administrators", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: mockUser({ isActive: true, isAdmin: true }) as any,
      isLoading: false,
    });

    render(<AppSidebar />);

    expect(screen.getByText("Administration")).toBeDefined();
    // All admin sub-items
    expect(screen.getByText("Academic Years")).toBeDefined();
    expect(screen.getByText("Sessions")).toBeDefined();
    expect(screen.getByText("Subjects")).toBeDefined();
    expect(screen.getByText("Users")).toBeDefined();
  });

  it("uses TanStack Router <Link> (not bare <a> tags with full href) for nav items", () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: mockUser({ isActive: true }) as any,
      isLoading: false,
    });

    render(<AppSidebar />);

    // Our mock renders data-testid="router-link"
    const links = screen.getAllByTestId("router-link");
    expect(links.length).toBeGreaterThan(0);

    // Each link should have a data-to attribute (TanStack `to` prop), not an href
    for (const link of links) {
      // data-to is set by our mock from the `to` prop
      expect(link.getAttribute("data-to")).toBeTruthy();
    }
  });
});
