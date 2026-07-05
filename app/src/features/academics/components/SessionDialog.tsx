import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/lib/convex";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sessionFormSchema = z.object({
  sessionCode: z
    .string()
    .min(1, "Session code is required")
    .trim()
    .refine((val) => /^\d{6}$/.test(val), {
      message: "Session code must be exactly 6 digits",
    })
    .refine((val) => /(01|05|09)$/.test(val), {
      message: "Session code must end in 01, 05, or 09",
    }),
  facultyId: z.string().min(1, "Faculty is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  defaultDeadlineStr: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface SessionDialogProps {
  open: boolean;
  onClose: () => void;
  session?: Doc<"academicSessions"> | null;
}

export function SessionDialog({ open, onClose, session }: SessionDialogProps) {
  const createMutate = useMutation(api.sessions.createSession);
  const updateMutate = useMutation(api.sessions.updateSession);

  // Fetch faculties and academic years
  const facultiesResult = useQuery(api.sessions.listFaculties, { activeOnly: true });
  const yearsResult = useQuery(api.academicYears.listAcademicYears, {
    activeOnly: true,
    paginationOpts: { numItems: 100, cursor: null },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      sessionCode: "",
      facultyId: "",
      academicYearId: "",
      defaultDeadlineStr: "",
    },
  });

  // Helper to convert timestamp to datetime-local string
  const formatTimestampToDatetimeLocal = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    // Format to YYYY-MM-DDTHH:mm in local time
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    if (open) {
      if (session) {
        reset({
          sessionCode: session.sessionCode,
          facultyId: session.facultyId,
          academicYearId: session.academicYearId,
          defaultDeadlineStr: formatTimestampToDatetimeLocal(session.defaultDeadline),
        });
      } else {
        reset({
          sessionCode: "",
          facultyId: "",
          academicYearId: "",
          defaultDeadlineStr: "",
        });
      }
    }
  }, [open, session, reset]);

  const onSubmit = async (values: SessionFormValues) => {
    try {
      const defaultDeadline = values.defaultDeadlineStr
        ? new Date(values.defaultDeadlineStr).getTime()
        : undefined;

      const payload = {
        sessionCode: values.sessionCode,
        facultyId: values.facultyId as Id<"faculties">,
        academicYearId: values.academicYearId as Id<"academicYears">,
        defaultDeadline,
      };

      if (session) {
        await updateMutate({ id: session._id, ...payload });
      } else {
        await createMutate(payload);
      }

      toast.success(session ? "Session updated successfully" : "Session created successfully");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{session ? "Edit Academic Session" : "Create Academic Session"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sessionCode">Session Code</Label>
            <Controller
              name="sessionCode"
              control={control}
              render={({ field }) => (
                <Input id="sessionCode" placeholder="e.g. 202501" {...field} />
              )}
            />
            {errors.sessionCode && (
              <p role="alert" className="text-xs text-destructive">
                {errors.sessionCode.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="facultyId">Faculty</Label>
            <Controller
              name="facultyId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="facultyId">
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {facultiesResult?.map((fac) => (
                      <SelectItem key={fac._id} value={fac._id}>
                        {fac.code} - {fac.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.facultyId && (
              <p role="alert" className="text-xs text-destructive">
                {errors.facultyId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="academicYearId">Academic Year</Label>
            <Controller
              name="academicYearId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="academicYearId">
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearsResult?.page.map((year) => (
                      <SelectItem key={year._id} value={year._id}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.academicYearId && (
              <p role="alert" className="text-xs text-destructive">
                {errors.academicYearId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultDeadlineStr">Default Deadline (Optional)</Label>
            <Controller
              name="defaultDeadlineStr"
              control={control}
              render={({ field }) => (
                <Input type="datetime-local" id="defaultDeadlineStr" {...field} />
              )}
            />
            {errors.defaultDeadlineStr && (
              <p role="alert" className="text-xs text-destructive">
                {errors.defaultDeadlineStr.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {session ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
