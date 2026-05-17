// index.js — The entry point of our Express server
// Think of this as the "main" file that starts everything up

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Load .env variables into process.env

const app = express();

// --- Middleware ---
// Middleware = functions that run on every request before hitting your routes
// cors() allows our React frontend to make requests to this server
app.use(cors());
// express.json() parses incoming JSON request bodies so we can read req.body
app.use(express.json());

// --- Routes ---
// Routes define what happens when someone hits a URL endpoint
// We split these into separate files to keep things organized
app.use('/api/customers', require('./routes/customers'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/emails', require('./routes/emails'));
app.use('/api/jobs', require('./routes/jobs'));

const scheduledEmailsRouter = require('./routes/scheduledEmails');
app.use('/api/scheduled-emails', scheduledEmailsRouter);

// --- Database Connection ---
// mongoose.connect() opens a connection to MongoDB
// process.env.MONGO_URI reads the value from our .env file
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Check every minute for scheduled emails that are due to send
    const { sendDueEmails } = require('./routes/scheduledEmails');
    setInterval(() => {
      sendDueEmails().catch((err) => console.error('Scheduled email check failed:', err));
    }, 60 * 1000);
  })
  .catch((err) => console.error('MongoDB connection error:', err));
