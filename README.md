# Zen Backend (MyLife OS)

This is the backend repository for the **MyLife OS** (zen-dev) application. It is a high-performance REST API designed to handle webhooks, email notifications, and background synchronization synchronization tasks securely.

## 🚀 Tech Stack

- **Framework**: [Fastify](https://fastify.dev/) (v5) - Blazing fast Node.js web framework.
- **Database / BaaS**: [Supabase](https://supabase.com/) - PostgreSQL database and real-time subscriptions.
- **Authentication**: [Clerk](https://clerk.com/) - Integrated via `@clerk/fastify` for secure route protection.
- **Email Service**: [Resend](https://resend.com/) - Developer-first email delivery.
- **Security**: `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`, `svix` (for webhook signature verification).

## 📂 Project Structure

```text
src/
├── config/       # Environment variables validation and loading
├── middleware/   # Custom Fastify hooks (e.g., Clerk Auth, Svix Webhooks)
├── routes/       # API endpoints (Auth, Emails, Notifications, Sync)
├── services/     # 3rd-party integrations (Supabase Client, Resend)
└── server.js     # Fastify application entry point
```

## ⚙️ Local Development Setup

### 1. Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/vinaynural/zen-backend.git
cd zen-backend
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
# Application Settings
PORT=3000
NODE_ENV=development

# Supabase (Service Role Key required for backend operations bypassing RLS)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Auth
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_svix_webhook_secret

# Resend Mail
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=notifications@yourdomain.com
```

### 4. Running the Server

**Development Mode (with auto-reload):**

```bash
npm run dev
```

**Production Mode:**

```bash
npm start
```

## 🌐 API Routes

- `POST /api/webhooks/clerk` - Listens to Clerk user creation/deletion events to sync users into Supabase.
- `POST /api/email/send` - Internal route to trigger transactional emails via Resend.
- `GET /api/health` - Simple health check endpoint for deployment monitoring.

## 🚀 Deployment

This application is ready to be deployed to any Node.js compatible platform like **Render**, **Railway**, or **Heroku**. Ensure that all environment variables from your `.env` file are securely added to your platform's configuration settings. The start command is `npm start`.
