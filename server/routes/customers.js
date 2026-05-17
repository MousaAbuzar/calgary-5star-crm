// customers.js — API routes for managing customers
// REST API convention:
//   GET    /api/customers        → list all customers
//   POST   /api/customers        → create a new customer
//   GET    /api/customers/:id    → get one customer by ID
//   PUT    /api/customers/:id    → update a customer
//   DELETE /api/customers/:id    → delete a customer

const express = require('express');
const router = express.Router(); // Router = a mini express app for a specific set of routes
const Customer = require('../models/Customer');

// POST /import — bulk-create customers from a parsed CSV upload
// Must be before /:id routes so Express doesn't treat "import" as an ID
router.post('/import', async (req, res) => {
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ message: 'No customer data provided' });
    }
    let created = 0;
    let failed = 0;
    const errors = [];
    for (const data of customers) {
      try {
        // Empty string email breaks the sparse unique index — use undefined instead
        if (!data.email) data.email = undefined;
        await Customer.create(data);
        created++;
      } catch (err) {
        failed++;
        errors.push({ email: data.email, error: err.message });
      }
    }
    res.json({ created, failed, errors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all customers — with optional search/filter
// e.g. GET /api/customers?status=active&tag=residential
router.get('/', async (req, res) => {
  try {
    const { search, status, tag } = req.query;
    // Build a dynamic query object based on what filters were passed
    const query = {};

    if (status) query.status = status;
    if (tag) query.tags = tag; // MongoDB checks if the array contains this value
    if (search) {
      // $or = match any of these conditions
      // $regex = pattern match, $options: 'i' = case insensitive
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create a new customer
router.post('/', async (req, res) => {
  try {
    // req.body contains the JSON data sent from the frontend
    const customer = new Customer(req.body);
    const saved = await customer.save();
    // 201 = "Created" (more specific than 200 = "OK")
    res.status(201).json(saved);
  } catch (err) {
    // 400 = "Bad Request" (e.g. validation failed)
    res.status(400).json({ message: err.message });
  }
});

// PUT update a customer
router.put('/:id', async (req, res) => {
  try {
    // findByIdAndUpdate returns the updated document ({ new: true })
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true, // Run schema validators on update too
    });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
