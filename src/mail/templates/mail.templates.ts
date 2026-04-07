export const buildWelcomeEmailTemplate = (fullName: string): string => `
Hi ${fullName},

Welcome to Task Management API 🎉
Your account has been created successfully.

Best regards,
Task Management Team
`;

export const buildTaskAssignedEmailTemplate = (
  fullName: string,
  taskTitle: string,
): string => `
Hi ${fullName},

You have been assigned a new task: "${taskTitle}".
Please check your dashboard to see details.

Best regards,
Task Management Team
`;
