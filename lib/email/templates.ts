/**
 * Email templates for transactional emails
 */

export interface CodeRabbitNotInstalledEmailParams {
  repoName: string;
  userName?: string;
}

/**
 * Generate subject line for CodeRabbit not installed email
 */
export function getCodeRabbitNotInstalledSubject(): string {
  return "🐰 Your repo is missing a code review buddy!";
}

/**
 * Generate HTML body for CodeRabbit not installed email
 */
export function getCodeRabbitNotInstalledHtml(
  params: CodeRabbitNotInstalledEmailParams
): string {
  const { repoName, userName } = params;
  const greeting = userName ? `Hey ${userName}!` : "Hey there!";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>${greeting} 👋</p>
  
  <p>We noticed you just connected <strong>${repoName}</strong> to Pithy Jaunt—nice choice! 🎉</p>
  
  <p>Here's the thing: your repository could be even more awesome with CodeRabbit on board. Think of CodeRabbit as your friendly code review assistant that:</p>
  
  <ul style="margin: 20px 0; padding-left: 20px;">
    <li>✨ Catches bugs before they become problems</li>
    <li>🔒 Spots security issues you might miss</li>
    <li>⚡ Suggests performance improvements</li>
    <li>📚 Helps maintain code quality across your team</li>
  </ul>
  
  <p>The best part? It's free to get started and takes just a few clicks to set up.</p>
  
  <p>Ready to level up your code reviews? 👇</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://app.coderabbit.ai/login?free-trial" 
       style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
      Get CodeRabbit Free →
    </a>
  </div>
  
  <p>Happy coding! 🚀</p>
  
  <p>— The Pithy Jaunt Team</p>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text body for CodeRabbit not installed email
 */
export function getCodeRabbitNotInstalledText(
  params: CodeRabbitNotInstalledEmailParams
): string {
  const { repoName, userName } = params;
  const greeting = userName ? `Hey ${userName}!` : "Hey there!";

  return `
${greeting} 👋

We noticed you just connected ${repoName} to Pithy Jaunt—nice choice! 🎉

Here's the thing: your repository could be even more awesome with CodeRabbit on board. Think of CodeRabbit as your friendly code review assistant that:

✨ Catches bugs before they become problems
🔒 Spots security issues you might miss
⚡ Suggests performance improvements
📚 Helps maintain code quality across your team

The best part? It's free to get started and takes just a few clicks to set up.

Ready to level up your code reviews? 👇

Get CodeRabbit Free: https://app.coderabbit.ai/login?free-trial

Happy coding! 🚀

— The Pithy Jaunt Team
  `.trim();
}


