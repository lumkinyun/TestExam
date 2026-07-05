import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/lib/convex";
import type { Doc } from "../../../../convex/_generated/dataModel";

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

const academicYearSchema = z
  .object({
    label: z
      .string()
      .min(1, "Academic year is required")
      .trim()
      .refine((val) => /^\d{4}\/\d{4}$/.test(val), {
        message: "Format must be YYYY/YYYY (e.g. 2025/2026)",
      }),
  })
  .refine(
    (data) => {
      const match = data.label.match(/^(\d{4})\/(\d{4})$/);
      if (!match) return false;
      const first = parseInt(match[1], 10);
      const second = parseInt(match[2], 10);
      return second === first + 1;
    },
    {
      message: "Second year must be exactly one more than the first year",
      path: ["label"],
    }
  );

type AcademicYearFormValues = z.infer<typeof academicYearSchema>;

interface AcademicYearDialogProps {
  open: boolean;
  onClose: () => void;
  academicYear?: Doc<"academicYears"> | null;
}

export function AcademicYearDialog({ open, onClose, academicYear }: AcademicYearDialogProps) {
  const createMutate = useMutation(api.academicYears.createAcademicYear);
  const updateMutate = useMutation(api.academicYears.updateAcademicYear);


  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AcademicYearFormValues>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      label: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (academicYear) {
        reset({ label: academicYear.label });
      } else {
        reset({ label: "" });
      }
    }
  }, [open, academicYear, reset]);

  const onSubmit = async (values: AcademicYearFormValues) => {
    try {
      if (academicYear) {
        await updateMutate({ id: academicYear._id, ...values });
      } else {
        await createMutate(values);
      }
      toast.success(
        academicYear ? "Academic year updated successfully" : "Academic year created successfully"
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{academicYear ? "Edit Academic Year" : "Create Academic Year"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Academic Year</Label>
            <Controller
              name="label"
              control={control}
              render={({ field }) => <Input id="label" placeholder="e.g. 2025/2026" {...field} />}
            />
            {errors.label && (
              <p role="alert" className="text-xs text-destructive">
                {errors.label.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {academicYear ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
