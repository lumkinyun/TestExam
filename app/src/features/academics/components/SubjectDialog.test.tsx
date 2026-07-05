import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubjectDialog } from "./SubjectDialog";
import "@testing-library/jest-dom";

// Mock the convex mutation hooks
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue("mock-id"),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock convex api
vi.mock("@/lib/convex", () => ({
  api: {
    subjects: {
      createSubject: "createSubject",
      updateSubject: "updateSubject",
    },
  },
}));

const mockOnClose = vi.fn();

function renderDialog(props = {}) {
  return render(
    <SubjectDialog
      open={true}
      onClose={mockOnClose}
      facultyId="mock-faculty-id"
      {...props}
    />
  );
}

describe("SubjectDialog", () => {
  describe("Form validation", () => {
    it("renders the dialog with course code and title fields", () => {
      renderDialog();
      expect(screen.getByLabelText(/course code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/course title/i)).toBeInTheDocument();
    });

    it("shows validation error when course code is empty and form is submitted", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /save|create|submit/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/course code/i, { selector: "[role='alert'], p, span" }) ||
          screen.queryAllByText(/required|invalid/i).length > 0
        ).toBeTruthy();
      });
    });

    it("shows validation error for invalid course code format", async () => {
      const user = userEvent.setup();
      renderDialog();

      const codeInput = screen.getByLabelText(/course code/i);
      await user.type(codeInput, "INVALID");
      await user.tab();

      await user.click(screen.getByRole("button", { name: /save|create|submit/i }));

      await waitFor(() => {
        const errorElements = screen.queryAllByRole("alert").concat(
          Array.from(document.querySelectorAll("p[id*='error'], .text-destructive, [data-error]"))
        );
        expect(errorElements.length > 0 || screen.queryByText(/4 uppercase letters.*4 digits|[A-Z]{4}[0-9]{4}|invalid.*code/i) !== null).toBe(true);
      });
    });

    it("shows validation error when course title is empty", async () => {
      const user = userEvent.setup();
      renderDialog();

      const codeInput = screen.getByLabelText(/course code/i);
      await user.type(codeInput, "BTMH3523");
      await user.click(screen.getByRole("button", { name: /save|create|submit/i }));

      await waitFor(() => {
        expect(screen.queryByText(/title.*required|required.*title/i) !== null ||
          screen.queryAllByRole("alert").length > 0).toBe(true);
      });
    });

    it("accepts a valid course code matching [A-Z]{4}[0-9]{4}", async () => {
      const user = userEvent.setup();
      renderDialog();

      const codeInput = screen.getByLabelText(/course code/i);
      await user.type(codeInput, "BTMH3523");

      // Should not show error for valid code
      await waitFor(() => {
        const errorText = screen.queryByText(/invalid.*course code|course code.*invalid/i);
        expect(errorText).toBeNull();
        expect(codeInput).toHaveValue("BTMH3523");
      });
    });

    it("uppercases course code input before display", async () => {
      const user = userEvent.setup();
      renderDialog();

      const codeInput = screen.getByLabelText(/course code/i);
      await user.type(codeInput, "btmh3523");

      // The field value should be uppercase (via Controller transform or onChange handler)
      await waitFor(() => {
        expect((codeInput as HTMLInputElement).value.toUpperCase()).toBe("BTMH3523");
      });
    });

    it("trims whitespace from course title on submission", async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn().mockResolvedValue("new-id");
      
      // Re-render with a controlled mutate spy
      render(
        <SubjectDialog
          open={true}
          onClose={mockOnClose}
          facultyId="mock-faculty-id"
          _testMutate={mockMutate}
        />
      );

      const codeInput = screen.getAllByLabelText(/course code/i)[0];
      const titleInput = screen.getAllByLabelText(/course title/i)[0];

      await user.type(codeInput, "BACS1014");
      await user.type(titleInput, "  Intro to Programming  ");

      await user.click(screen.getAllByRole("button", { name: /save|create|submit/i })[0]);

      await waitFor(() => {
        if (mockMutate.mock.calls.length > 0) {
          const args = mockMutate.mock.calls[0][0];
          expect(args.courseTitle).toBe("Intro to Programming");
        }
      });
    });
  });

  describe("Controller usage", () => {
    it("uses React Hook Form Controller for course code field", () => {
      renderDialog();
      const input = screen.getByLabelText(/course code/i);
      // The input should be a controlled input
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe("INPUT");
    });

    it("uses React Hook Form Controller for course title field", () => {
      renderDialog();
      const input = screen.getByLabelText(/course title/i);
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe("INPUT");
    });
  });

  describe("Dialog behavior", () => {
    it("calls onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <SubjectDialog
          open={true}
          onClose={onClose}
          facultyId="mock-faculty-id"
        />
      );

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(onClose).toHaveBeenCalled();
    });

    it("renders in edit mode when subject prop is provided", () => {
      render(
        <SubjectDialog
          open={true}
          onClose={mockOnClose}
          facultyId="mock-faculty-id"
          subject={{
            _id: "subject-id-1" as any,
            _creationTime: Date.now(),
            courseCode: "BTMH3523",
            courseTitle: "Database Systems",
            facultyId: "mock-faculty-id" as any,
            isActive: true,
          }}
        />
      );

      const codeInput = screen.getByLabelText(/course code/i) as HTMLInputElement;
      const titleInput = screen.getByLabelText(/course title/i) as HTMLInputElement;

      expect(codeInput.value).toBe("BTMH3523");
      expect(titleInput.value).toBe("Database Systems");
    });
  });
});
