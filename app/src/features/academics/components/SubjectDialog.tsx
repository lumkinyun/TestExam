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

const subjectFormSchema = z.object({
  courseCode: z
    .string()
    .min(1, "Course code is required")
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => /^[A-Z]{4}[0-9]{4}$/.test(val), {
      message: "Course code must be 4 uppercase letters followed by 4 digits (e.g. BTMH3523)",
    }),
  courseTitle: z
    .string()
    .min(1, "Course title is required")
    .transform((val) => val.trim()),
});

type SubjectFormValues = z.infer<typeof subjectFormSchema>;

interface SubjectDialogProps {
  open: boolean;
  onClose: () => void;
  facultyId: string;
  subject?: Doc<"subjects"> | null;
  _testMutate?: (args: any) => Promise<any>;
}

export function SubjectDialog({
  open,
  onClose,
  facultyId,
  subject,
  _testMutate,
}: SubjectDialogProps) {
  const createMutate = useMutation(api.subjects.createSubject);
  const updateMutate = useMutation(api.subjects.updateSubject);


  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      courseCode: "",
      courseTitle: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (subject) {
        reset({
          courseCode: subject.courseCode,
          courseTitle: subject.courseTitle,
        });
      } else {
        reset({
          courseCode: "",
          courseTitle: "",
        });
      }
    }
  }, [open, subject, reset]);

  const onSubmit = async (values: SubjectFormValues) => {
    try {
      if (_testMutate) {
        await _testMutate(subject ? { id: subject._id, ...values, facultyId: facultyId as any } : { ...values, facultyId: facultyId as any });
      } else if (subject) {
        await updateMutate({ id: subject._id, ...values, facultyId: facultyId as any });
      } else {
        await createMutate({ ...values, facultyId: facultyId as any });
      }
      toast.success(subject ? "Subject updated successfully" : "Subject created successfully");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{subject ? "Edit Subject" : "Create Subject"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="courseCode">Course Code</Label>
            <Controller
              name="courseCode"
              control={control}
              render={({ field }) => (
                <Input
                  id="courseCode"
                  placeholder="e.g. BTMH3523"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              )}
            />
            {errors.courseCode && (
              <p role="alert" className="text-xs text-destructive">
                {errors.courseCode.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="courseTitle">Course Title</Label>
            <Controller
              name="courseTitle"
              control={control}
              render={({ field }) => (
                <Input id="courseTitle" placeholder="e.g. Database Systems" {...field} />
              )}
            />
            {errors.courseTitle && (
              <p role="alert" className="text-xs text-destructive">
                {errors.courseTitle.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {subject ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
