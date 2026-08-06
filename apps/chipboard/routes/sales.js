const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { oldPool } = require('../db');
const { MysqlSalesRepository } = require('../services/salesRepository');
const { SalesService } = require('../services/salesService');
const { CompositeSalesEventPublisher, MysqlEventOutboxPublisher, MysqlSalesAuditLogger, SalesWebhookPublisher } = require('../services/salesEvents');

const salesService = new SalesService({
  repository: new MysqlSalesRepository(oldPool),
  events: new CompositeSalesEventPublisher([
    new MysqlEventOutboxPublisher(oldPool),
    new SalesWebhookPublisher()
  ]),
  audit: new MysqlSalesAuditLogger(oldPool)
});

const getTenantContext = (req, res) => {
  const organizationId = req.auth?.organizationId;

  if (!organizationId) {
    res.status(403).json({ message: 'Organization access required' });
    return null;
  }

  return {
    organizationId,
    actorUserId: req.auth.userId,
    role: req.auth.role
  };
};

const handleSalesError = (res, error, fallbackMessage) => {
  if (error.statusCode === 400) {
    return res.status(400).json({
      message: error.message,
      ...error.details
    });
  }

  if (error.statusCode === 403) {
    return res.status(403).json({ message: error.message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({
    message: fallbackMessage,
    error: error.message,
    details: error.sqlMessage
  });
};

// Get all sales
router.get('/', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const results = await salesService.listSales(context);
    res.json(results);
  } catch (error) {
    handleSalesError(res, error, 'Error fetching sales data');
  }
});

// Add new sale
router.post('/', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const sale = await salesService.createSale(context, req.body);

    res.status(201).json({
      message: 'Sale created successfully',
      id: sale.id,
      ...req.body
    });
  } catch (error) {
    handleSalesError(res, error, 'Error creating sale');
  }
});

// Update sale
router.put('/:id', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const sale = await salesService.updateSale(context, req.params.id, req.body);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    handleSalesError(res, error, 'Error updating sale');
  }
});

// Delete sale
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const sale = await salesService.deleteSale(context, req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    handleSalesError(res, error, 'Error deleting sale');
  }
});

// Get pending sales
router.get('/pending-sales', authenticate, async (req, res) => {
  try {
    const context = getTenantContext(req, res);
    if (!context) return;

    const results = await salesService.listPendingSales(context);
    res.json(results);
  } catch (error) {
    handleSalesError(res, error, 'Error fetching pending sales');
  }
});

module.exports = router;


