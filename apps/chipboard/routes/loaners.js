const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

async function submitToLoanerFlow(payload) {
  const url = process.env.LOANER_REQUEST_FLOW_URL;

  if (!url) {
    return {
      ok: false,
      message: 'Loaner request Power Automate URL is not configured.'
    };
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (process.env.LOANER_REQUEST_FLOW_KEY) {
    headers['x-chipboard-key'] = process.env.LOANER_REQUEST_FLOW_KEY;
  }

  try {
    const response = await axios.post(url, payload, {
      headers,
      timeout: 15000
    });

    return {
      ok: true,
      status: response.status,
      data: response.data || null
    };
  } catch (error) {
    console.error('Error submitting loaner request flow:', error.response?.data || error.message);
    const responseMessage = error.response?.data?.message || error.response?.data?.error || error.message;
    return {
      ok: false,
      status: error.response?.status || null,
      message: typeof responseMessage === 'string' ? responseMessage : JSON.stringify(responseMessage),
      details: error.response?.data || null
    };
  }
}

router.get('/test', (req, res) => {
  res.json({ message: 'Loaner request router is working!' });
});

router.post('/request', authenticate, async (req, res) => {
  try {
    const {
      saleStockNumber,
      customerName,
      advisorEmail,
      notes,
      stockNumber,
      clientName,
      soldUnit,
      additionalInformation,
      clientAdvisorEmail,
      respondersEmail
    } = req.body;
    const normalizedStockNumber = saleStockNumber || stockNumber;
    const normalizedCustomerName = customerName || clientName;
    const normalizedAdditionalInformation = additionalInformation || notes || '';
    const normalizedClientAdvisorEmail = clientAdvisorEmail || advisorEmail || '';
    const normalizedRespondersEmail = respondersEmail || req.auth.email || '';

    if (!normalizedStockNumber || !normalizedCustomerName || !soldUnit || !normalizedAdditionalInformation || !normalizedClientAdvisorEmail || !normalizedRespondersEmail) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['stockNumber', 'clientName', 'soldUnit', 'additionalInformation', 'clientAdvisorEmail', 'respondersEmail'],
        received: req.body
      });
    }

    const loanerRequest = {
      stockNumber: normalizedStockNumber,
      clientName: normalizedCustomerName,
      soldUnit,
      additionalInformation: normalizedAdditionalInformation,
      clientAdvisorEmail: normalizedClientAdvisorEmail,
      respondersEmail: normalizedRespondersEmail
    };

    const flowResult = await submitToLoanerFlow(loanerRequest);

    if (!flowResult.ok) {
      return res.status(502).json({
        message: 'Loaner request could not be submitted to Power Automate.',
        data: loanerRequest,
        flow: flowResult
      });
    }

    res.status(200).json({
      message: 'Loaner request submitted successfully',
      data: loanerRequest,
      flow: flowResult
    });
  } catch (error) {
    console.error('Error submitting loaner request:', error);
    res.status(500).json({
      message: 'Error submitting loaner request',
      error: error.message
    });
  }
});

module.exports = router;
