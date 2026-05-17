// Customer.js — A Mongoose Model (Schema)
// A schema = a blueprint that defines what a "customer" document looks like in MongoDB
// Without this, MongoDB would just store any random data with no structure

const mongoose = require('mongoose');

// mongoose.Schema() defines the fields and their types
const CustomerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true, // This field is mandatory
      trim: true,     // Automatically removes leading/trailing whitespace
    },
    lastName: {
      type: String,
      required: false,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,   // allows multiple docs with no email without breaking the unique index
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      postcode: String,
    },
    // Tags help you segment customers for targeted campaigns
    // e.g. ["residential", "recurring", "commercial"]
    tags: [String],
    notes: String,
    // Track where this customer came from
    source: {
      type: String,
      enum: ['website', 'referral', 'social_media', 'cold_outreach', 'other'],
      default: 'other',
    },
    // Is this an active customer or not?
    status: {
      type: String,
      enum: ['active', 'inactive', 'prospect'],
      default: 'prospect',
    },
    // Has this customer unsubscribed from emails?
    emailOptOut: {
      type: Boolean,
      default: false,
    },
  },
  {
    // timestamps: true automatically adds createdAt and updatedAt fields
    timestamps: true,
  }
);

// Export the model — mongoose.model('Customer', schema) creates the model
// MongoDB will store documents in a collection called "customers" (auto-pluralized)
module.exports = mongoose.model('Customer', CustomerSchema);
