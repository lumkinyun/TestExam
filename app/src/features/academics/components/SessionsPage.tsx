import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { toast } from "sonner";
import { SessionDialog } from "./SessionDialog";
import type { Doc } from "../../../../convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/features/shell/components/PageHeader";

export default function SessionsPage() {
  const [search, setSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [pageCursor, setPageCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Doc<"academicSessions"> | null>(null);

  // Reset page index when filters change
  useEffect(() => {
    setPageCursor(null);
    setCursorHistory([]);
  }, [search, facultyFilter, yearFilter, activeOnly]);

  // Fetch lists for filters and display mapping
  const facultiesResult = useQuery(api.sessions.listFaculties, {});
  const yearsResult = useQuery(api.academicYears.listAcademicYears, {
    paginationOpts: { numItems: 100, cursor: null },
  });

  const sessionsResult = useQuery(api.sessions.listSessions, {
    paginationOpts: { numItems: 10, cursor: pageCursor },
    activeOnly,
    facultyId: facultyFilter === "all" ? undefined : (facultyFilter as any),
    academicYearId: yearFilter === "all" ? undefined : (yearFilter as any),
    search: search || undefined,
  });

  const deactivateMutate = useMutation(api.sessions.deactivateSession);
  const restoreMutate = useMutation(api.sessions.restoreSession);

  const handleDeactivate = async (id: typeof editingSession extends null ? any : any) => {
    try {
      await deactivateMutate({ id });
      toast.success("Session deactivated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate");
    }
  };

  const handleRestore = async (id: typeof editingSession extends null ? any : any) => {
    try {
      await restoreMutate({ id });
      toast.success("Session restored");
    } catch (err: any) {
      toast.error(err?.message || "Failed to restore");
    }
  };

  const handleNextPage = () => {
    if (sessionsResult?.continueCursor) {
      setCursorHistory((prev) => [...prev, pageCursor]);
      setPageCursor(sessionsResult.continueCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory((prev) => prev.slice(0, -1));
      setPageCursor(prevCursor);
    }
  };

  // Helper mappings
  const facultyMap = new Map(facultiesResult?.map((f) => [f._id, f.code]));
  const yearMap = new Map(yearsResult?.page.map((y) => [y._id, y.label]));

  const formatDeadline = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Academic Sessions" description="Manage semesters and session schedules by faculty." />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1 max-w-2xl">
          <Input
            placeholder="Search sessions (e.g. 202501)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={facultyFilter} onValueChange={(val) => setFacultyFilter(val || "all")}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="All Faculties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Faculties</SelectItem>
              {facultiesResult?.map((f) => (
                <SelectItem key={f._id} value={f._id}>
                  {f.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={(val) => setYearFilter(val || "all")}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Academic Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Academic Years</SelectItem>
              {yearsResult?.page.map((y) => (
                <SelectItem key={y._id} value={y._id}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeOnly ? "secondary" : "outline"}
            onClick={() => setActiveOnly((prev) => !prev)}
          >
            {activeOnly ? "Show All" : "Active Only"}
          </Button>
          <Button
            onClick={() => {
              setEditingSession(null);
              setDialogOpen(true);
            }}
          >
            Add Session
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Code</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Default Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionsResult === undefined ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading sessions...
                  </TableCell>
                </TableRow>
              ) : sessionsResult.page.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No sessions found.
                  </TableCell>
                </TableRow>
              ) : (
                sessionsResult.page.map((session) => (
                  <TableRow key={session._id} className={!session.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{session.sessionCode}</TableCell>
                    <TableCell>{facultyMap.get(session.facultyId) || "-"}</TableCell>
                    <TableCell>{yearMap.get(session.academicYearId) || "-"}</TableCell>
                    <TableCell>{formatDeadline(session.defaultDeadline)}</TableCell>
                    <TableCell>
                      {session.isActive ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-stone-100 text-stone-500 border-stone-200">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingSession(session);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {session.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(session._id)}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleRestore(session._id)}>
                          Restore
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {sessionsResult && (sessionsResult.continueCursor || cursorHistory.length > 0) && (
        <div className="flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={cursorHistory.length === 0}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!sessionsResult.continueCursor}>
            Next
          </Button>
        </div>
      )}

      <SessionDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingSession(null);
        }}
        session={editingSession}
      />
    </div>
  );
}
