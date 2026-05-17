const mongoose = require('mongoose');

const ScheduledEmailSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    body:    { type: String, required: true },
    // Individual customers chosen by the user
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
    // When to send
    sendAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'failed'],
      default: 'pending',
    },
    sentCount:   { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    sentAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduledEmail', ScheduledEmailSchema);
