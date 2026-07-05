import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { toast } from "sonner";
import { AcademicYearDialog } from "./AcademicYearDialog";
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
import { PageHeader } from "@/features/shell/components/PageHeader";

export default function AcademicYearsPage() {
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [pageCursor, setPageCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<Doc<"academicYears"> | null>(null);

  // Reset page index when search or filters change
  useEffect(() => {
    setPageCursor(null);
    setCursorHistory([]);
  }, [search, activeOnly]);

  const yearsResult = useQuery(api.academicYears.listAcademicYears, {
    paginationOpts: { numItems: 10, cursor: pageCursor },
    activeOnly,
    search: search || undefined,
  });

  const deactivateMutate = useMutation(api.academicYears.deactivateAcademicYear);
  const restoreMutate = useMutation(api.academicYears.restoreAcademicYear);

  const handleDeactivate = async (id: typeof editingYear extends null ? any : any) => {
    try {
      await deactivateMutate({ id });
      toast.success("Academic year deactivated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate");
    }
  };

  const handleRestore = async (id: typeof editingYear extends null ? any : any) => {
    try {
      await restoreMutate({ id });
      toast.success("Academic year restored");
    } catch (err: any) {
      toast.error(err?.message || "Failed to restore");
    }
  };

  const handleNextPage = () => {
    if (yearsResult?.continueCursor) {
      setCursorHistory((prev) => [...prev, pageCursor]);
      setPageCursor(yearsResult.continueCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory((prev) => prev.slice(0, -1));
      setPageCursor(prevCursor);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Academic Years" description="Manage academic years for examination schedules." />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4 max-w-sm">
          <Input
            placeholder="Search academic years (e.g. 2025)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
              setEditingYear(null);
              setDialogOpen(true);
            }}
          >
            Add Academic Year
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Academic Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearsResult === undefined ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Loading academic years...
                  </TableCell>
                </TableRow>
              ) : yearsResult.page.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No academic years found.
                  </TableCell>
                </TableRow>
              ) : (
                yearsResult.page.map((year) => (
                  <TableRow key={year._id} className={!year.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{year.label}</TableCell>
                    <TableCell>
                      {year.isActive ? (
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
                          setEditingYear(year);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {year.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(year._id)}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleRestore(year._id)}>
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

      {yearsResult && (yearsResult.continueCursor || cursorHistory.length > 0) && (
        <div className="flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={cursorHistory.length === 0}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!yearsResult.continueCursor}>
            Next
          </Button>
        </div>
      )}

      <AcademicYearDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingYear(null);
        }}
        academicYear={editingYear}
      />
    </div>
  );
}
