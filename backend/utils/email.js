import nodemailer from 'nodemailer'

// Create reusable transporter
const createTransporter = () => {
  // If email is not configured, return null (will log to console instead)
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
}

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`

  const mailOptions = {
    from: `"RELAY" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request - RELAY',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Password Reset Request</h2>
        <p>You requested to reset your password for your RELAY account.</p>
        <p>Click the button below to reset your password:</p>
        <p style="margin: 20px 0;">
          <a href="${resetLink}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          POWERED BY DUKES TECHNOLOGIES
        </p>
      </div>
    `,
    text: `
Password Reset Request - RELAY

You requested to reset your password for your RELAY account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour. If you didn't request this, please ignore this email.

POWERED BY DUKES TECHNOLOGIES
    `
  }

  const transporter = createTransporter()

  if (!transporter) {
    // Email not configured - log to console (development mode)
    console.log('\n=== PASSWORD RESET EMAIL (Email not configured) ===')
    console.log(`To: ${email}`)
    console.log(`Subject: ${mailOptions.subject}`)
    console.log(`Reset Link: ${resetLink}`)
    console.log('==================================================\n')
    return { success: true, method: 'console' }
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Password reset email sent:', info.messageId)
    return { success: true, method: 'email', messageId: info.messageId }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    // Fallback to console logging if email fails
    console.log('\n=== PASSWORD RESET EMAIL (Email sending failed) ===')
    console.log(`To: ${email}`)
    console.log(`Reset Link: ${resetLink}`)
    console.log('==================================================\n')
    return { success: false, error: error.message, method: 'console' }
  }
}
