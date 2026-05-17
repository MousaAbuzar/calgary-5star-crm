// emails.js — The bulk email sending engine
// This is the core feature of the CRM

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Campaign = require('../models/Campaign');
const Customer = require('../models/Customer');
const EmailLog = require('../models/EmailLog');

// --- Create the email transporter ---
// A "transporter" is nodemailer's connection to your email provider
// It's created once and reused for all sends
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // false = STARTTLS (port 587), true = SSL (port 465)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /api/emails/send/:campaignId
// Triggers bulk sending for a campaign
router.post('/send/:campaignId', async (req, res) => {
  try {
    // 1. Load the campaign
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (campaign.status === 'sent') {
      return res.status(400).json({ message: 'Campaign already sent' });
    }

    // 2. Find the target customers
    // Build query: exclude opted-out customers, only active/prospects
    const customerQuery = {
      emailOptOut: false,
      status: { $in: ['active', 'prospect'] },
    };
    // If the campaign has target tags, only email customers with those tags
    if (campaign.targetTags && campaign.targetTags.length > 0) {
      customerQuery.tags = { $in: campaign.targetTags };
    }

    const customers = await Customer.find(customerQuery);
    if (customers.length === 0) {
      return res.status(400).json({ message: 'No eligible customers found for this campaign' });
    }

    // 3. Mark campaign as "sending" immediately so UI can show progress
    campaign.status = 'sending';
    campaign.stats.totalRecipients = customers.length;
    await campaign.save();

    // 4. Respond to the HTTP request immediately — don't make the user wait
    // The actual sending happens in the background (async, non-blocking)
    res.json({
      message: `Campaign sending started to ${customers.length} recipients`,
      totalRecipients: customers.length,
    });

    // 5. Send emails in the background
    // We use a loop with await so emails go out one at a time (rate-limit friendly)
    let sentCount = 0;
    let failedCount = 0;

    for (const customer of customers) {
      try {
        // Personalise the email body — replace {{firstName}} with actual name
        const personalizedBody = campaign.body
          .replace(/{{firstName}}/g, customer.firstName)
          .replace(/{{lastName}}/g, customer.lastName)
          .replace(/{{email}}/g, customer.email);

        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: customer.email,
          subject: campaign.subject,
          html: personalizedBody, // HTML format so you can style your emails
        });

        // Log the successful send
        await EmailLog.create({
          campaign: campaign._id,
          customer: customer._id,
          recipientEmail: customer.email,
          status: 'sent',
        });

        sentCount++;
      } catch (emailErr) {
        // One failed email shouldn't stop the whole campaign
        console.error(`Failed to send to ${customer.email}:`, emailErr.message);

        await EmailLog.create({
          campaign: campaign._id,
          customer: customer._id,
          recipientEmail: customer.email,
          status: 'failed',
          errorMessage: emailErr.message,
        });

        failedCount++;
      }

      // Small delay between emails to avoid hitting provider rate limits
      // 200ms = 5 emails/second — safe for Gmail and most SMTP providers
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // 6. Update campaign stats once all emails are processed
    campaign.status = failedCount === customers.length ? 'failed' : 'sent';
    campaign.sentAt = new Date();
    campaign.stats.sent = sentCount;
    campaign.stats.failed = failedCount;
    await campaign.save();

    console.log(`Campaign "${campaign.name}" complete: ${sentCount} sent, ${failedCount} failed`);
  } catch (err) {
    console.error('Campaign send error:', err);
    // Try to mark campaign as failed if something went badly wrong
    try {
      await Campaign.findByIdAndUpdate(req.params.campaignId, { status: 'failed' });
    } catch (_) {}
  }
});

// POST /api/emails/test/:campaignId
// Sends a single test email to one address — does NOT touch campaign status or logs
// Use this to check your template looks right before sending to real customers
router.post('/test/:campaignId', async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: 'A "to" email address is required' });

    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    // Use placeholder values so the tokens render — makes the test realistic
    const previewBody = campaign.body
      .replace(/{{firstName}}/g, 'Test')
      .replace(/{{lastName}}/g, 'User')
      .replace(/{{email}}/g, to);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      // Prefix subject so you know in your inbox this was a test
      subject: `[TEST] ${campaign.subject}`,
      html: previewBody,
    });

    res.json({ message: `Test email sent to ${to}` });
  } catch (err) {
    // If nodemailer throws (bad credentials, network error etc.) send a clear error
    res.status(500).json({ message: `Failed to send test email: ${err.message}` });
  }
});

// GET /api/emails/logs/:campaignId
// Fetch the email logs for a specific campaign (for the results view)
router.get('/logs/:campaignId', async (req, res) => {
  try {
    const logs = await EmailLog.find({ campaign: req.params.campaignId })
      .populate('customer', 'firstName lastName email') // .populate() joins the Customer data
      .sort({ sentAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/emails/preview/:campaignId
// Returns list of customers who would receive this campaign (for preview before sending)
router.get('/preview/:campaignId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const customerQuery = {
      emailOptOut: false,
      status: { $in: ['active', 'prospect'] },
    };
    if (campaign.targetTags && campaign.targetTags.length > 0) {
      customerQuery.tags = { $in: campaign.targetTags };
    }

    const customers = await Customer.find(customerQuery, 'firstName lastName email tags status');
    res.json({ count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
