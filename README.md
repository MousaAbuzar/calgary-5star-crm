# Calgary 5 Star Cleaning — CRM

A full-stack CRM (Customer Relationship Management) system built specifically for Calgary 5 Star Cleaning. Manage customers, schedule jobs, track bookings, run email campaigns, and monitor business performance — all in one place.

![Dashboard Preview](docs/preview.png)

---

## Features

### Customers
- Add, edit, and delete customers with full contact details (name, email, phone, address, tags, notes)
- Filter and search customers by name, email, status, or tag
- Bulk import customers from a CSV file (supports your existing spreadsheet format: Submission Date, Name, Phone number, Email, Address)
- Customer detail page showing full job history and stats

### Jobs & Calendar
- Schedule jobs for customers with a service type, price, date, and time
- Month-view calendar showing all booked jobs at a glance
- Click any day to see that day's jobs or add a new one
- Edit and delete jobs, update status (Scheduled / Completed / Cancelled / No Access) and payment status

### Dashboard
- Stat cards: Total Contacts, Active Customers, Prospects, Jobs Completed, Jobs Upcoming, Value Booked, Campaigns Sent, Emails Sent
- **7-day booking chart** — area graph showing the dollar value of scheduled jobs for the next 7 days
- **7-day booking goal** — set a revenue target, watch the progress bar fill as jobs are booked, with stats on jobs booked, amount still needed, and average per job. Goal persists across sessions.

### Email Campaigns
- Create rich HTML email campaigns with a live preview tab
- Target customers by tag, status, or select individually
- Send immediately or schedule for a future date/time
- Campaign stats: recipients, sent count, failed count
- Edit or cancel pending scheduled emails before they send

### Invoice Sending
- Generate and email a professional HTML invoice for any completed job directly from the customer's job history

---

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, React Router, Recharts, Axios |
| Backend  | Node.js, Express 5 |
| Database | MongoDB Atlas (Mongoose ODM) |
| Email    | Nodemailer (SMTP) |
| Styling  | Plain CSS with Inter font, CSS custom properties |

---

## Project Structure

```
CRM/
├── client/                  # React frontend
│   ├── public/
│   │   └── logo.png         # Place your logo here
│   └── src/
│       ├── api/             # Axios API layer (all HTTP calls)
│       ├── components/      # Reusable components (Navbar, forms, modals)
│       └── pages/           # Route-level pages (Dashboard, Customers, Calendar, etc.)
│
└── server/                  # Express backend
    ├── models/              # Mongoose schemas (Customer, Job, Campaign, ScheduledEmail)
    ├── routes/              # REST API routes
    │   ├── customers.js     # GET/POST/PUT/DELETE + bulk import
    │   ├── jobs.js          # CRUD + stats/summary + stats/upcoming + invoice email
    │   ├── campaigns.js     # Email campaign management
    │   ├── emails.js        # Send/preview/test campaign emails
    │   └── scheduledEmails.js # Scheduled email queue + background sender
    ├── middleware/          # Auth / error middleware
    └── index.js             # App entry point, DB connection, scheduler
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier works)
- An SMTP email account for sending emails (Gmail, Outlook, etc.)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/calgary-5star-crm.git
cd calgary-5star-crm
```

### 2. Install dependencies

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `server/` folder:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/crm?retryWrites=true&w=majority

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Calgary 5 Star Cleaning <your@gmail.com>"

BUSINESS_NAME=Calgary 5 Star Cleaning
PORT=5000
```

> **Gmail tip:** Use an [App Password](https://support.google.com/accounts/answer/185833) rather than your main account password.

### 4. Add your logo

Copy your logo image to:
```
client/public/logo.png
```
It will appear automatically in the navbar.

### 5. Run the app

Open two terminals:

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm start
```

The app opens at **http://localhost:3000**. The React dev server proxies `/api` requests to `http://localhost:5000`.

---

## CSV Import Format

The import tool accepts CSV files with these column names (case-insensitive):

| Column | Required | Notes |
|--------|----------|-------|
| Name | Yes | Split on first space into first/last name |
| Email | No | Deduplicated — duplicates are skipped |
| Phone number | No | Leading `'` (Excel formatting) stripped automatically |
| Address | No | Mapped to street |
| Submission Date | No | Ignored (used for sorting in your spreadsheet) |
| tags | No | Semicolon-separated list, e.g. `residential;recurring` |
| status | No | `active`, `inactive`, or `prospect` (default) |
| source | No | `website`, `referral`, `social_media`, `cold_outreach`, or `other` |

---

## Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `EMAIL_HOST` | SMTP server hostname |
| `EMAIL_PORT` | SMTP port (usually 587 for TLS) |
| `EMAIL_USER` | SMTP login username |
| `EMAIL_PASS` | SMTP login password or app password |
| `EMAIL_FROM` | Sender name and address shown in emails |
| `BUSINESS_NAME` | Appears in invoice headers |
| `PORT` | Server port (default 5000) |

---

## License

MIT
