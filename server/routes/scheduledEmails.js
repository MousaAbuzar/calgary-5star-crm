const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const ScheduledEmail = require('../models/ScheduledEmail');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// GET / — list all scheduled emails, newest first
router.get('/', async (req, res) => {
  try {
    const emails = await ScheduledEmail.find()
      .populate('recipients', 'firstName lastName email')
      .sort({ sendAt: -1 });
    res.json(emails);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST / — create a new scheduled email
router.post('/', async (req, res) => {
  try {
    const email = new ScheduledEmail(req.body);
    const saved = await email.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /:id — edit a pending email (cannot edit already-sent emails)
router.put('/:id', async (req, res) => {
  try {
    const email = await ScheduledEmail.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Not found' });
    if (email.status !== 'pending') {
      return res.status(400).json({ message: 'Can only edit pending emails' });
    }
    const { subject, body, sendAt, recipients } = req.body;
    if (subject)    email.subject    = subject;
    if (body)       email.body       = body;
    if (sendAt)     email.sendAt     = sendAt;
    if (recipients) email.recipients = recipients;
    const saved = await email.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /:id — cancel a pending email
router.delete('/:id', async (req, res) => {
  try {
    const email = await ScheduledEmail.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Not found' });
    if (email.status !== 'pending') {
      return res.status(400).json({ message: 'Can only cancel pending emails' });
    }
    await email.deleteOne();
    res.json({ message: 'Scheduled email cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Called by the background interval in index.js every minute
async function sendDueEmails() {
  const due = await ScheduledEmail.find({
    status: 'pending',
    sendAt: { $lte: new Date() },
  }).populate('recipients', 'firstName lastName email');

  for (const email of due) {
    email.status = 'sending';
    await email.save();

    let sentCount = 0;
    let failedCount = 0;

    for (const customer of email.recipients) {
      if (!customer.email) { failedCount++; continue; }
      try {
        const body = email.body
          .replace(/{{firstName}}/g, customer.firstName)
          .replace(/{{lastName}}/g, customer.lastName)
          .replace(/{{email}}/g, customer.email);

        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: customer.email,
          subject: email.subject,
          html: body,
        });
        sentCount++;
      } catch (err) {
        console.error(`Scheduled email failed for ${customer.email}:`, err.message);
        failedCount++;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    email.status = failedCount === email.recipients.length && sentCount === 0 ? 'failed' : 'sent';
    email.sentCount = sentCount;
    email.failedCount = failedCount;
    email.sentAt = new Date();
    await email.save();

    console.log(`Scheduled email "${email.subject}": ${sentCount} sent, ${failedCount} failed`);
  }
}

module.exports = router;
module.exports.sendDueEmails = sendDueEmails;
