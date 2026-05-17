// Campaign.js — Represents an email marketing campaign
// e.g. "Spring Cleaning Offer 2026" sent to all residential customers

const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true, // The email subject line
    },
    // The email body — we'll support plain HTML so you can style emails
    body: {
      type: String,
      required: true,
    },
    // Which customer tags to target — empty array means all customers
    // e.g. ["residential"] sends only to residential customers
    targetTags: [String],
    // Campaign status lifecycle: draft → scheduled → sending → sent
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
      default: 'draft',
    },
    // When was (or will) the campaign be sent
    scheduledAt: Date,
    sentAt: Date,
    // Stats — updated as emails are sent
    stats: {
      totalRecipients: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Campaign', CampaignSchema);
