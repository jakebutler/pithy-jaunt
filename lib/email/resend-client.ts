import { Resend } from "resend";

/**
 * Resend client singleton
 * Initializes Resend with API key from environment variables
 */
let resendClient: Resend | null = null;

/**
 * Get or create Resend client instance
 * @returns Resend client instance or null if API key is missing
 */
export function getResendClient(): Resend | null {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set. Email sending will be disabled.");
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Check if Resend is configured
 * @returns true if RESEND_API_KEY is set
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}


