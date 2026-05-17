// jobs.js — API routes for job management

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Job = require('../models/Job');
const Customer = require('../models/Customer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const SERVICE_LABELS = {
  exterior_windows: 'Exterior Windows',
  interior_windows: 'Interior Windows',
  interior_exterior: 'Interior & Exterior',
  conservatory: 'Conservatory',
  gutters: 'Gutters',
  fascias_soffits: 'Fascias & Soffits',
  pressure_wash: 'Pressure Wash',
  other: 'Other',
};

// GET /api/jobs?customerId=xxx
// Fetch all jobs, optionally filtered to one customer
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.customerId) query.customer = req.query.customerId;
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.date.$lte = new Date(req.query.endDate);
    }

    const jobs = await Job.find(query)
      .populate('customer', 'firstName lastName address')
      .sort({ date: -1 }); // Most recent first
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/jobs/stats/upcoming — next 7 days booking value for chart
// Must be before /:id so Express doesn't treat "stats" as an ID
router.get('/stats/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + i)));
    }
    const endDate = new Date(days[6]);
    endDate.setUTCHours(23, 59, 59, 999);

    const jobs = await Job.find({
      status: 'scheduled',
      date: { $gte: days[0], $lte: endDate },
    });

    const map = {};
    for (const job of jobs) {
      const key = job.date.toISOString().substring(0, 10);
      if (!map[key]) map[key] = { value: 0, count: 0 };
      map[key].value += job.priceInPence;
      map[key].count++;
    }

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = days.map((d) => {
      const key = d.toISOString().substring(0, 10);
      const data = map[key] || { value: 0, count: 0 };
      return {
        day: DAY_LABELS[d.getUTCDay()],
        date: key,
        value: parseFloat((data.value / 100).toFixed(2)),
        count: data.count,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/jobs/stats/summary
// Job counts — used on the dashboard
router.get('/stats/summary', async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const stats = await Job.aggregate([
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          completedJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          futureJobs: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'scheduled'] }, { $gte: ['$date', now] }] },
                1,
                0,
              ],
            },
          },
          futureValue: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'scheduled'] }, { $gte: ['$date', now] }] },
                '$priceInPence',
                0,
              ],
            },
          },
        },
      },
    ]);

    res.json(stats[0] || { totalJobs: 0, completedJobs: 0, futureJobs: 0, futureValue: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/jobs/:id — single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('customer', 'firstName lastName');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/jobs — create a job
router.post('/', async (req, res) => {
  try {
    const customer = await Customer.findById(req.body.customer);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const job = new Job(req.body);
    const saved = await job.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/jobs/:id — update a job
router.put('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/jobs/:id/invoice — generate and email an invoice for a job
router.post('/:id/invoice', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('customer');
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const c = job.customer;
    if (!c.email) return res.status(400).json({ message: 'Customer has no email address' });

    const businessName = process.env.BUSINESS_NAME || 'Window Cleaning Services';
    const price = `$${(job.priceInPence / 100).toFixed(2)}`;
    const jobDate = new Date(job.date).toLocaleDateString('en-GB');
    const invoiceDate = new Date().toLocaleDateString('en-GB');
    const serviceLabel = SERVICE_LABELS[job.serviceType] || job.serviceType;

    const addressLines = [c.address?.street, c.address?.city, c.address?.postcode]
      .filter(Boolean)
      .map((l) => `<p style="margin:2px 0;color:#374151;font-size:14px;">${l}</p>`)
      .join('');

    const paymentBadge = job.paymentStatus === 'paid'
      ? `<div style="margin-top:20px;background:#dcfce7;color:#15803d;padding:12px 16px;border-radius:6px;font-weight:600;font-size:14px;">✓ PAID</div>`
      : `<div style="margin-top:20px;background:#fef3c7;color:#d97706;padding:12px 16px;border-radius:6px;font-weight:600;font-size:14px;">Payment Due</div>`;

    const notesSection = job.notes
      ? `<p style="margin-top:16px;color:#6b7280;font-size:13px;"><strong>Notes:</strong> ${job.notes}</p>`
      : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f9fafb;font-family:Arial,sans-serif;">
<table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:white;border-radius:8px;border:1px solid #e5e7eb;">
  <tr><td style="background:#2563eb;padding:24px 32px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;color:white;font-size:22px;letter-spacing:2px;">INVOICE</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${businessName}</p>
  </td></tr>
  <tr><td style="padding:28px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="vertical-align:top;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Bill To</p>
        <p style="margin:0;font-weight:600;font-size:15px;">${c.firstName} ${c.lastName}</p>
        ${addressLines}
        <p style="margin:2px 0;color:#374151;font-size:14px;">${c.email}</p>
      </td>
      <td width="50%" style="vertical-align:top;text-align:right;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Invoice Date</p>
        <p style="margin:0 0 16px;font-size:14px;">${invoiceDate}</p>
        <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Job Date</p>
        <p style="margin:0;font-size:14px;">${jobDate}</p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 14px;border:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;">Service</th>
        <th style="text-align:right;padding:10px 14px;border:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-transform:uppercase;">Amount</th>
      </tr>
      <tr>
        <td style="padding:14px;border:1px solid #e5e7eb;font-size:14px;">${serviceLabel}</td>
        <td style="text-align:right;padding:14px;border:1px solid #e5e7eb;font-size:14px;font-weight:600;">${price}</td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:16px 32px;text-align:right;">
    <p style="margin:0;font-size:18px;font-weight:700;color:#111827;">Total: ${price}</p>
  </td></tr>
  <tr><td style="padding:0 32px 24px;">${paymentBadge}${notesSection}</td></tr>
  <tr><td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
    <p style="margin:0;color:#6b7280;font-size:13px;">Thank you for your business!</p>
  </td></tr>
</table>
</body></html>`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: c.email,
      subject: `Invoice — ${serviceLabel} on ${jobDate}`,
      html,
    });

    res.json({ message: `Invoice sent to ${c.email}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
