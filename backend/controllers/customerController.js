const Customer = require("../models/customer");
const Counter = require("../models/counter");

// Create a customer
const createCustomer = async (req, res) => {
  try {
    // Generate the next customer ID
    const counter = await Counter.findByIdAndUpdate(
      "customerId",
      { $inc: { seq: 1 } },
      { new: true },
    );

    // Create customer with generated ID
    const customer = await Customer.create({
      ...req.body,
      customerId: counter.seq,
    });

    res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// Get all customers
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();

    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get customer by ID
// Get customer by custom customer ID
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      customerId: Number(req.params.id),
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.status(200).json(customer);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// Update customer
// Update customer using custom customer ID
const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { customerId: Number(req.params.id) },
      req.body,
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.status(200).json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// Delete customer
// Delete customer using custom customer ID
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({
      customerId: Number(req.params.id),
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.status(200).json({
      message: "Customer deleted successfully",
      customerId: customer.customerId,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
