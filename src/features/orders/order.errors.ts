export class OrderValidationError extends Error {
  issues: {
    item_id: string;
    code: string;
    requested?: number;
    available?: number;
    previous_price?: number;
    current_price?: number;
  }[] = [];
  constructor(error: { message: string; details?: string }) {
    super(error.message);
    try {
      const issues: unknown = JSON.parse(error.details || "[]");
      if (Array.isArray(issues)) this.issues = issues;
    } catch {
      /* Unexpected server errors keep their message. */
    }
  }
}
