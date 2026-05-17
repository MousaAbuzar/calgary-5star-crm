// EmailLog.js — Records every individual email sent
// Why? So you can audit what was sent, to whom, and whether it succeeded
// This is important for debugging and compliance (e.g. not re-emailing someone)

const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema(
  {
    // ref: 'Campaign' creates a relationship — this log belongs to a campaign
    // Like a foreign key in SQL databases
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    // Store the email address at time of sending (in case customer updates later)
    recipientEmail: String,
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    // If it failed, why?
    errorMessage: String,
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EmailLog', EmailLogSchema);
