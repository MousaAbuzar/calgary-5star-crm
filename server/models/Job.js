// Job.js — Represents a single window cleaning job for a customer
// This is what makes the CRM useful beyond just email — you can track
// every job you've done, when it was, what you charged, and whether it's paid

const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
  {
    // Which customer this job belongs to
    // ObjectId + ref = a relationship, like a foreign key in SQL
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    // When the job is/was scheduled
    date: {
      type: Date,
      required: true,
    },
    // Time of day as "HH:MM" string, e.g. "09:30"
    time: {
      type: String,
    },
    serviceType: {
      type: String,
      enum: [
        'exterior_windows',
        'interior_windows',
        'interior_exterior',
        'conservatory',
        'gutters',
        'fascias_soffits',
        'pressure_wash',
        'other',
      ],
      required: true,
    },
    // Price in cents to avoid floating point issues
    // e.g. $45.00 = 4500
    priceInPence: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_access'],
      default: 'scheduled',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'overdue'],
      default: 'unpaid',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Job', JobSchema);
