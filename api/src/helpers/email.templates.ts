// Email templates for admin operations
export const adminEmailTemplates = {
  // Welcome email template for new users
  WELCOME_USER: {
    subject: 'Welcome to KitiPay - Your Account Credentials',
    heading: 'Welcome to KitiPay!',
    template: (fullName: string, username: string, password: string) => `
Hello ${fullName || username},

Welcome to KitiPay! Your account has been created successfully.

Your login credentials:
Username: ${username}
Password: ${password}

Please change your password after your first login for security.

Best regards,
KitiPay Team
    `
  },

  // Welcome email template for new system users (admins)
  WELCOME_SYSTEM_USER: {
    subject: 'Welcome to KitiPay Admin - Your Account Credentials',
    heading: 'Welcome to KitiPay Admin!',
    template: (fullName: string, username: string, password: string) => `
Hello ${fullName || username},

Welcome to KitiPay Admin Panel! Your administrator account has been created successfully.

Your login credentials:
Username: ${username}
Password: ${password}

Please change your password after your first login for security.

Best regards,
KitiPay Admin Team
    `
  },

  // Password reset email template
  PASSWORD_RESET: {
    subject: 'KitiPay - Password Reset',
    heading: 'Password Reset',
    template: (fullName: string, username: string, newPassword: string) => `
Hello ${fullName || username},

Your password has been reset by an administrator.

Your new login credentials:
Username: ${username}
New Password: ${newPassword}

Please change your password after your next login for security.

Best regards,
KitiPay Team
    `
  },

  // Admin password change notification
  ADMIN_PASSWORD_CHANGE: {
    subject: 'KitiPay Admin - Password Changed',
    heading: 'Password Changed',
    template: (fullName: string, username: string, newPassword: string) => `
Hello ${fullName || username},

Your admin password has been changed.

Your new login credentials:
Username: ${username}
New Password: ${newPassword}

Please change your password after your next login for security.

Best regards,
KitiPay Admin Team
    `
  },

  // User account deactivation notification
  USER_DEACTIVATED: {
    subject: 'KitiPay - Account Deactivated',
    heading: 'Account Deactivated',
    template: (fullName: string, username: string, reason?: string) => `
Hello ${fullName || username},

Your KitiPay account has been deactivated by an administrator.

${reason ? `Reason: ${reason}` : ''}

If you believe this was done in error, please contact support.

Best regards,
KitiPay Team
    `
  },

  // User account reactivation notification
  USER_REACTIVATED: {
    subject: 'KitiPay - Account Reactivated',
    heading: 'Account Reactivated',
    template: (fullName: string, username: string) => `
Hello ${fullName || username},

Your KitiPay account has been reactivated by an administrator.

You can now log in to your account normally.

Best regards,
KitiPay Team
    `
  },

  // Wallet deactivation notification
  WALLET_DEACTIVATED: {
    subject: 'KitiPay - Wallet Deactivated',
    heading: 'Wallet Deactivated',
    template: (fullName: string, walletId: string, reason?: string) => `
Hello ${fullName},

Your KitiPay wallet (ID: ${walletId}) has been deactivated by an administrator.

${reason ? `Reason: ${reason}` : ''}

If you believe this was done in error, please contact support.

Best regards,
KitiPay Team
    `
  },

  // Payment type update notification
  PAYMENT_TYPE_UPDATED: {
    subject: 'KitiPay - Payment Method Updated',
    heading: 'Payment Method Updated',
    template: (paymentType: string, changes: string) => `
Hello,

The payment method "${paymentType}" has been updated by an administrator.

Changes made:
${changes}

This may affect your payment options. Please check your payment settings.

Best regards,
KitiPay Team
    `
  }
};

// Helper function to get template by key
export const getEmailTemplate = (templateKey: keyof typeof adminEmailTemplates) => {
  return adminEmailTemplates[templateKey];
}; 