import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { toast } from "sonner";
import { SubjectDialog } from "./SubjectDialog";
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

export default function SubjectsPage() {
  const [search, setSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [pageCursor, setPageCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Doc<"subjects"> | null>(null);

  // Fetch faculties list
  const facultiesResult = useQuery(api.sessions.listFaculties, {});

  // Set default faculty filter once faculties load
  useEffect(() => {
    if (facultiesResult && facultiesResult.length > 0 && facultyFilter === "all") {
      setFacultyFilter(facultiesResult[0]._id);
    }
  }, [facultiesResult]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setPageCursor(null);
    setCursorHistory([]);
  }, [search, facultyFilter, activeOnly]);

  const subjectsResult = useQuery(api.subjects.listSubjects, {
    paginationOpts: { numItems: 10, cursor: pageCursor },
    activeOnly,
    facultyId: facultyFilter === "all" ? undefined : (facultyFilter as any),
    search: search || undefined,
  });

  const deactivateMutate = useMutation(api.subjects.deactivateSubject);
  const restoreMutate = useMutation(api.subjects.restoreSubject);

  const handleDeactivate = async (id: typeof editingSubject extends null ? any : any) => {
    try {
      await deactivateMutate({ id });
      toast.success("Subject deactivated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate");
    }
  };

  const handleRestore = async (id: typeof editingSubject extends null ? any : any) => {
    try {
      await restoreMutate({ id });
      toast.success("Subject restored");
    } catch (err: any) {
      toast.error(err?.message || "Failed to restore");
    }
  };

  const handleNextPage = () => {
    if (subjectsResult?.continueCursor) {
      setCursorHistory((prev) => [...prev, pageCursor]);
      setPageCursor(subjectsResult.continueCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory((prev) => prev.slice(0, -1));
      setPageCursor(prevCursor);
    }
  };

  const facultyMap = new Map(facultiesResult?.map((f) => [f._id, f.code]));

  return (
    <div className="space-y-6">
      <PageHeader title="Subjects" description="Manage course codes, titles, and subject definitions by faculty." />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1 max-w-xl">
          <Input
            placeholder="Search subjects (code or title)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={facultyFilter} onValueChange={(val) => setFacultyFilter(val || "all")}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select Faculty" />
            </SelectTrigger>
            <SelectContent>
              {facultiesResult?.map((f) => (
                <SelectItem key={f._id} value={f._id}>
                  {f.code} - {f.name}
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
            disabled={facultyFilter === "all" || !facultyFilter}
            onClick={() => {
              setEditingSubject(null);
              setDialogOpen(true);
            }}
          >
            Add Subject
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Code</TableHead>
                <TableHead>Course Title</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectsResult === undefined ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading subjects...
                  </TableCell>
                </TableRow>
              ) : subjectsResult.page.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No subjects found.
                  </TableCell>
                </TableRow>
              ) : (
                subjectsResult.page.map((subj) => (
                  <TableRow key={subj._id} className={!subj.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-mono font-medium">{subj.courseCode}</TableCell>
                    <TableCell>{subj.courseTitle}</TableCell>
                    <TableCell>{facultyMap.get(subj.facultyId) || "-"}</TableCell>
                    <TableCell>
                      {subj.isActive ? (
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
                          setEditingSubject(subj);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {subj.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(subj._id)}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleRestore(subj._id)}>
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

      {subjectsResult && (subjectsResult.continueCursor || cursorHistory.length > 0) && (
        <div className="flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={cursorHistory.length === 0}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!subjectsResult.continueCursor}>
            Next
          </Button>
        </div>
      )}

      {facultyFilter !== "all" && facultyFilter && (
        <SubjectDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingSubject(null);
          }}
          facultyId={facultyFilter}
          subject={editingSubject}
        />
      )}
    </div>
  );
}
