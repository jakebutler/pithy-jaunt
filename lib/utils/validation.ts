import { z } from "zod";

// Email validation schema
const emailSchema = z.string().email();

/**
 * Validates an email address using zod
 * @param email - The email address to validate
 * @returns An object with success boolean and optional error message
 */
export function validateEmail(email: string): { success: boolean; error?: string } {
  const result = emailSchema.safeParse(email);
  
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0]?.message || "Invalid email format"
    };
  }
  
  return { success: true };
}
