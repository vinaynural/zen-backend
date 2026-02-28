import { Resend } from 'resend';
import env from '../config/env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const FROM_EMAIL = 'MyLife OS <noreply@mylifeos.app>';

/**
 * Send a welcome email to a newly registered user.
 *
 * @param {string} email - Recipient email address
 * @param {string} name  - Recipient display name
 * @returns {Promise<object>} Resend API response
 */
export async function sendWelcomeEmail(email, name) {
  if (!resend) {
    throw new Error('Resend is not configured — RESEND_API_KEY is missing');
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Welcome to MyLife OS!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
          .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; padding: 40px; }
          h1 { color: #18181b; font-size: 24px; margin-bottom: 16px; }
          p { color: #3f3f46; font-size: 16px; line-height: 1.6; }
          .cta { display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          .footer { text-align: center; color: #a1a1aa; font-size: 13px; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome, ${escapeHtml(name)}!</h1>
          <p>Thanks for joining <strong>MyLife OS</strong>. We are excited to help you build better habits, track your health, and achieve your goals.</p>
          <p>Here is what you can do to get started:</p>
          <ul>
            <li>Set up your first habit tracker</li>
            <li>Create daily goals</li>
            <li>Start journaling</li>
          </ul>
          <p>If you have any questions, just reply to this email.</p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MyLife OS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }

  return data;
}

/**
 * Send a daily digest email with the user's stats.
 *
 * @param {string} email - Recipient email address
 * @param {object} stats - Daily stats to include in the digest
 * @param {number} [stats.habitsCompleted=0]  - Number of habits completed today
 * @param {number} [stats.habitsTotal=0]      - Total habits for today
 * @param {number} [stats.tasksCompleted=0]   - Number of tasks completed today
 * @param {number} [stats.tasksTotal=0]       - Total tasks for today
 * @param {number} [stats.journalEntries=0]   - Journal entries written today
 * @param {string} [stats.streak='0']         - Current streak in days
 * @returns {Promise<object>} Resend API response
 */
export async function sendDailyDigest(email, stats) {
  if (!resend) {
    throw new Error('Resend is not configured — RESEND_API_KEY is missing');
  }

  const {
    habitsCompleted = 0,
    habitsTotal = 0,
    tasksCompleted = 0,
    tasksTotal = 0,
    journalEntries = 0,
    streak = '0',
  } = stats;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Your Daily Digest — MyLife OS',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
          .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; padding: 40px; }
          h1 { color: #18181b; font-size: 22px; margin-bottom: 24px; }
          .stat-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
          .stat-card { flex: 1 1 45%; background: #f4f4f5; border-radius: 8px; padding: 16px; text-align: center; }
          .stat-value { font-size: 28px; font-weight: 700; color: #6366f1; }
          .stat-label { font-size: 13px; color: #71717a; margin-top: 4px; }
          p { color: #3f3f46; font-size: 15px; line-height: 1.6; }
          .footer { text-align: center; color: #a1a1aa; font-size: 13px; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Your Daily Digest</h1>
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-value">${habitsCompleted}/${habitsTotal}</div>
              <div class="stat-label">Habits Completed</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${tasksCompleted}/${tasksTotal}</div>
              <div class="stat-label">Tasks Done</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${journalEntries}</div>
              <div class="stat-label">Journal Entries</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${escapeHtml(String(streak))}</div>
              <div class="stat-label">Day Streak</div>
            </div>
          </div>
          <p>Keep up the great work! Consistency is the key to lasting change.</p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MyLife OS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send daily digest: ${error.message}`);
  }

  return data;
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(str) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}
