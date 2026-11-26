const Customer = require("../models/Customer");
const Counter = require("../models/counter");
const { createAuditLog } = require("../services/auditService");

// Safely record audit history without interrupting customer operations
const recordAudit = async (auditData) => {
  try {
    await createAuditLog(auditData);
  } catch (error) {
    console.error("Customer audit recording failed:", error.message);
  }
};

// Fields captured in audit history
const getCustomerAuditData = (customer) => ({
  customerId: customer.customerId,
  fullName: customer.fullName,
  email: customer.email,
  phone: customer.phone,
  companyName: customer.companyName,
  servicePlan: customer.servicePlan,
  accountStatus: customer.accountStatus,
});

// Create a customer
const createCustomer = async (req, res) => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      "customerId",
      { $inc: { seq: 1 } },
      { new: true },
    );

    const customer = await Customer.create({
      ...req.body,
      customerId: counter.seq,
    });

    await recordAudit({
      action: "Created",
      entityType: "Customer",
      entityId: String(customer.customerId),
      performedBy: req.body.performedBy || "System",
      description: `Customer ${customer.customerId} created`,
      newData: getCustomerAuditData(customer),
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
const updateCustomer = async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    const existingCustomer = await Customer.findOne({ customerId });

    if (!existingCustomer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const previousData = getCustomerAuditData(existingCustomer);

    const customer = await Customer.findOneAndUpdate({ customerId }, req.body, {
      returnDocument: "after",
      runValidators: true,
    });

    const newData = getCustomerAuditData(customer);

    const action =
      previousData.accountStatus !== newData.accountStatus
        ? "Status Changed"
        : "Updated";

    await recordAudit({
      action,
      entityType: "Customer",
      entityId: String(customer.customerId),
      performedBy: req.body.performedBy || "System",
      description:
        action === "Status Changed"
          ? `Customer ${customer.customerId} account status changed from ${previousData.accountStatus} to ${newData.accountStatus}`
          : `Customer ${customer.customerId} updated`,
      previousData,
      newData,
    });

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

    await recordAudit({
      action: "Deleted",
      entityType: "Customer",
      entityId: String(customer.customerId),
      performedBy: req.body?.performedBy || "System",
      description: `Customer ${customer.customerId} deleted`,
      previousData: getCustomerAuditData(customer),
    });

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
