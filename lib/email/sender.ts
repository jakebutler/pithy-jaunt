import { getResendClient, isResendConfigured } from "./resend-client";
import {
  getCodeRabbitNotInstalledSubject,
  getCodeRabbitNotInstalledHtml,
  getCodeRabbitNotInstalledText,
  type CodeRabbitNotInstalledEmailParams,
} from "./templates";

/**
 * Send email when CodeRabbit is not installed on a connected repository
 * @param params Email parameters including recipient email, repo name, etc.
 * @returns Promise that resolves to success status
 */
export async function sendCodeRabbitNotInstalledEmail(params: {
  to: string;
  repoName: string;
  userName?: string;
  from?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, repoName, userName, from } = params;

  // Validate Resend is configured
  if (!isResendConfigured()) {
    console.warn(
      "Resend is not configured. Skipping CodeRabbit not installed email."
    );
    return { success: false, error: "Resend not configured" };
  }

  const client = getResendClient();
  if (!client) {
    return { success: false, error: "Resend client not available" };
  }

  // Validate email address
  if (!to || !to.includes("@")) {
    return { success: false, error: "Invalid email address" };
  }

  try {
    const emailParams: CodeRabbitNotInstalledEmailParams = {
      repoName,
      userName,
    };

    const result = await client.emails.send({
      from: from || "Pithy Jaunt <onboarding@resend.dev>", // Default Resend domain for testing
      to,
      subject: getCodeRabbitNotInstalledSubject(),
      html: getCodeRabbitNotInstalledHtml(emailParams),
      text: getCodeRabbitNotInstalledText(emailParams),
    });

    if (result.error) {
      console.error("Failed to send CodeRabbit email:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("CodeRabbit not installed email sent successfully:", result.data?.id);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending CodeRabbit email:", error);
    return {
      success: false,
      error: errorMessage || "Unknown error sending email",
    };
  }
}


