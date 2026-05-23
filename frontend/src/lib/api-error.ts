import { toast } from "sonner";

export function getApiErrorMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) {
    return "Something went wrong. Please try again.";
  }

  const raw = error.message.trim();
  if (!raw) {
    return "Something went wrong. Please try again.";
  }

  try {
    const parsed = JSON.parse(raw) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(", ");
    }

    if (typeof parsed.message === "string" && parsed.message) {
      return parsed.message;
    }

    if (typeof parsed.error === "string" && parsed.error) {
      return parsed.error;
    }
  } catch {
    // Plain-text error body from the API.
  }

  return raw;
}

export function toastApiError(title: string, error: unknown) {
  const description = getApiErrorMessage(error);
  toast.error(title, { description });
}
