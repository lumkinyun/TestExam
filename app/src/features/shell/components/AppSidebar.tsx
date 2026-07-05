import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Printer,
  CalendarDays,
  BookOpen,
  Users,
  Upload,
  Mail,
  GraduationCap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "../../auth/hooks/useCurrentUser";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

const coreNavItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Assignments", to: "/assignments", icon: ClipboardList },
];

const printingNavItems: NavItem[] = [
  { label: "Printing", to: "/printing", icon: Printer },
];

const adminNavItems: NavItem[] = [
  { label: "Academic Years", to: "/admin/academic-years", icon: CalendarDays },
  { label: "Sessions", to: "/admin/sessions", icon: BookOpen },
  { label: "Subjects", to: "/admin/subjects", icon: GraduationCap },
  { label: "Assignments", to: "/admin/assignments", icon: ClipboardList },
  { label: "Imports", to: "/admin/imports", icon: Upload },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Gmail", to: "/admin/gmail", icon: Mail },
];

function NavItemButton({ item }: { item: NavItem }) {
  const state = useRouterState();
  const isActive =
    state.location.pathname === item.to ||
    state.location.pathname.startsWith(item.to + "/");

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={
          <Link to={item.to as Parameters<typeof Link>[0]["to"]}>
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        }
      />
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { user } = useCurrentUser();

  // Disabled/pending users see no navigation
  if (!user || !user.isActive) {
    return null;
  }

  const showPrinting = user.isPrintingStaff;
  const showAdmin = user.isAdmin;

  const visibleCoreItems = showPrinting
    ? [...coreNavItems, ...printingNavItems]
    : coreNavItems;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-2 py-3">
          <p className="text-sm font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
            Exam Moderation
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Core navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleCoreItems.map((item) => (
                <NavItemButton key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Administration group (admins only) */}
        {showAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <NavItemButton key={item.to} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
