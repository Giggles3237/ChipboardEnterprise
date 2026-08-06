const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const { sendGetReadyEmail, sendGetReadyEscalationEmail, escapeHtml } = require('../utils/getReadyEmail');
const { sendGetReadyWebhook } = require('../utils/webhook');

const escalationFormParser = express.urlencoded({ extended: false, limit: '16kb' });

function parseEscalationForm(req, res, next) {
  escalationFormParser(req, res, (error) => {
    if (error) {
      console.error('Error parsing Get Ready escalation form:', error);
      return res.status(400).send('The escalation form could not be read. Please reopen the link from the Get Ready email and try again.');
    }

    next();
  });
}

function buildDueDate(getReadyDate, promiseTime, dueBy) {
  if (getReadyDate) {
    const normalizedTime = /^\d{2}:\d{2}$/.test(String(promiseTime || '14:00'))
      ? String(promiseTime || '14:00')
      : '14:00';
    const parsed = new Date(`${getReadyDate}T${normalizedTime}:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (dueBy) {
    const fallback = new Date(String(dueBy).replace(' at ', ' '));
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.toISOString();
    }
  }

  return null;
}

async function submitToGetReadySystem(payload) {
  const url = process.env.GET_READY_API_URL || 'https://getready-ww41.onrender.com/api/integrations/bopchipboard/get-ready';
  const integrationKey = process.env.GET_READY_INTEGRATION_KEY || process.env.BOPCHIPBOARD_API_KEY;

  if (!integrationKey) {
    return {
      ok: false,
      message: 'Get Ready integration key is not configured.'
    };
  }

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-integration-key': integrationKey
      }
    });

    return {
      ok: true,
      vehicle: response.data?.vehicle || null
    };
  } catch (error) {
    console.error('Error submitting to Get Ready system:', error.response?.data || error.message);
    return {
      ok: false,
      message: error.response?.data?.message || error.message
    };
  }
}

function buildPublicApiBaseUrl(req) {
  if (process.env.BACKEND_PUBLIC_URL) {
    return process.env.BACKEND_PUBLIC_URL.replace(/\/$/, '');
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');

  return `${protocol}://${host}`;
}

function buildEscalationToken(getReadyData, senderEmail) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required to create Get Ready escalation links.');
  }

  return jwt.sign(
    {
      type: 'getready_escalation',
      getReadyData,
      senderEmail
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.GET_READY_ESCALATION_EXPIRES_IN || '30d' }
  );
}

function verifyEscalationToken(token) {
  if (!token) {
    const error = new Error('Missing escalation token.');
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required to verify Get Ready escalation links.');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.type !== 'getready_escalation' || !decoded.getReadyData) {
    const error = new Error('Invalid escalation token.');
    error.statusCode = 400;
    throw error;
  }

  return decoded;
}

// Test route without authentication
router.get('/test', (req, res) => {
  console.log('✅ GET /api/getready/test route hit');
  res.json({ message: 'GetReady router is working!' });
});

// Send Get Ready email
router.post('/send-email', authenticate, async (req, res) => {
  console.log('📧 POST /api/getready/send-email received');
  console.log('📋 Request body:', req.body);
  console.log('📋 Request headers:', req.headers);
  
  try {
    const {
      getReadyId,
      dueBy,
      chassis,
      vehicle,
      location,
      miles,
      itemsNeeded,
      additionalAction,
      comments,
      customerName,
      salesperson,
      submittedBy,
      salespersonEmail,
      year,
      make,
      modelName,
      color,
      getReadyDate,
      promiseTime
    } = req.body;

    // Validate required fields
    if (!getReadyId || !dueBy || !vehicle || !customerName) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['getReadyId', 'dueBy', 'vehicle', 'customerName'],
        received: req.body
      });
    }

    // Prepare data for email
    const getReadyData = {
      getReadyId,
      dueBy,
      chassis: chassis || '',
      vehicle,
      location: location || 'DETAIL',
      miles: miles || '',
      itemsNeeded: Array.isArray(itemsNeeded) ? itemsNeeded : [],
      additionalAction: additionalAction || 'Check for Open Campaigns',
      comments: comments || '',
      customerName,
      salesperson: salesperson || req.auth.userName,
      submittedBy: submittedBy || req.auth.userName,
      salespersonEmail: salespersonEmail || ''
    };

    const escalationToken = buildEscalationToken(getReadyData, req.auth.email);
    getReadyData.escalationUrl = `${buildPublicApiBaseUrl(req)}/api/getready/escalate?token=${encodeURIComponent(escalationToken)}`;

    // Send email with sender in CC
    const sendResult = await sendGetReadyEmail(getReadyData, [], req.auth.email);

    // Notify Teams channel
    await sendGetReadyWebhook(getReadyData);

    const integration = await submitToGetReadySystem({
      stock_number: getReadyId,
      year: Number(year),
      make,
      model: modelName,
      color,
      due_date: buildDueDate(getReadyDate, promiseTime, dueBy),
      submitted_by_name: salesperson || req.auth.userName,
      submitted_by_email: salespersonEmail || req.auth.email,
      instructions: Array.isArray(itemsNeeded) ? itemsNeeded : [],
      comments: comments || '',
      location: location || 'DETAIL',
      miles: miles || '',
      customerName,
      chassis: chassis || '',
      integration_source: 'bopchipboard'
    });

    res.status(200).json({
      message: 'Get Ready email sent successfully',
      data: getReadyData,
      recipients: sendResult?.to || [],
      cc: sendResult?.cc || null,
      integration
    });

  } catch (error) {
    console.error('Error sending Get Ready email:', error);
    res.status(500).json({
      message: 'Error sending Get Ready email',
      error: error.message
    });
  }
});

router.get('/escalate', async (req, res) => {
  console.log('Get Ready escalation confirmation opened');

  try {
    const { token } = req.query;
    const decoded = verifyEscalationToken(token);
    const getReadyData = decoded.getReadyData;
    const escapedStockNumber = escapeHtml(getReadyData.getReadyId || 'this stock number');
    const escapedFormAction = escapeHtml(`/api/getready/escalate?token=${encodeURIComponent(token)}`);

    res.status(200).send(`
      <!doctype html>
      <html>
        <head>
          <title>Escalate Get Ready</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; background: #f9fafb; color: #111827; }
            main { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; padding: 28px; }
            h1 { color: #991b1b; margin: 0 0 12px; }
            p { font-size: 16px; line-height: 1.45; }
            label { display: block; font-weight: 800; margin: 20px 0 8px; }
            textarea { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.4; min-height: 120px; padding: 12px; resize: vertical; width: 100%; }
            button { background: #b91c1c; border: 0; color: #ffffff; cursor: pointer; font-size: 16px; font-weight: 800; padding: 13px 18px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <main>
            <h1>Escalate ${escapedStockNumber}?</h1>
            <p>This will send an urgent escalation email to the same recipients from the original Get Ready email.</p>
            <form method="post" action="${escapedFormAction}" enctype="application/x-www-form-urlencoded">
              <label for="escalationComments">Comments to include in the urgent email</label>
              <textarea id="escalationComments" name="escalationComments" placeholder="Add what needs attention, who is waiting, or what has been missed."></textarea>
              <button type="submit">Send Urgent Escalation Email</button>
            </form>
          </main>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error opening Get Ready escalation confirmation:', error);
    res.status(error.statusCode || 500).send('This Get Ready could not be escalated. The link may have expired or is invalid.');
  }
});

router.post('/escalate', parseEscalationForm, async (req, res) => {
  console.log('Get Ready escalation send request received');

  try {
    const token = req.query.token || req.body?.token;
    const escalationComments = typeof req.body?.escalationComments === 'string'
      ? req.body.escalationComments.trim()
      : '';
    const decoded = verifyEscalationToken(token);
    const getReadyData = {
      ...decoded.getReadyData,
      escalatedBy: 'Escalation button',
      escalationComments
    };

    const sendResult = await sendGetReadyEscalationEmail(
      getReadyData,
      [],
      decoded.senderEmail || null
    );

    const escapedStockNumber = escapeHtml(getReadyData.getReadyId || 'this stock number');
    const escapedRecipients = escapeHtml((sendResult.to || []).join(', '));

    res.status(200).send(`
      <!doctype html>
      <html>
        <head>
          <title>Get Ready Escalated</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; background: #f9fafb; color: #111827; }
            main { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; padding: 28px; }
            h1 { color: #991b1b; margin: 0 0 12px; }
            p { font-size: 16px; line-height: 1.45; }
          </style>
        </head>
        <body>
          <main>
            <h1>Get Ready Escalated</h1>
            <p>The urgent escalation email for ${escapedStockNumber} has been sent.</p>
            <p>Sent to: ${escapedRecipients}</p>
          </main>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error escalating Get Ready:', error);
    res.status(500).send('This Get Ready could not be escalated. The link may have expired or the email system may be unavailable.');
  }
});

module.exports = router; 
