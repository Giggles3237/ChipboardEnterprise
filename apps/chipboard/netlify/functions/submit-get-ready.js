const DEFAULT_GET_READY_API_URL = 'https://getready-ww41.onrender.com/api/integrations/bopchipboard/get-ready';

function buildDueDate(getReadyDate, promiseTime) {
  if (!getReadyDate) {
    return null;
  }

  const normalizedTime = /^\d{2}:\d{2}$/.test(String(promiseTime || '14:00'))
    ? String(promiseTime || '14:00')
    : '14:00';
  const parsed = new Date(`${getReadyDate}T${normalizedTime}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed.' })
    };
  }

  const integrationKey = process.env.GET_READY_INTEGRATION_KEY;
  const getReadyApiUrl = process.env.GET_READY_API_URL || DEFAULT_GET_READY_API_URL;

  if (!integrationKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'GET_READY_INTEGRATION_KEY is not configured.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const dueDate = payload.due_date || buildDueDate(payload.getReadyDate, payload.promiseTime);

    if (!payload.stock_number || !payload.year || !payload.make || !payload.model || !dueDate) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Missing required get ready fields.' })
      };
    }

    const upstreamResponse = await fetch(getReadyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-integration-key': integrationKey
      },
      body: JSON.stringify({
        ...payload,
        due_date: dueDate
      })
    });

    const responseText = await upstreamResponse.text();
    let responseBody;

    try {
      responseBody = responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
      responseBody = { message: responseText || 'Unexpected response from Get Ready service.' };
    }

    return {
      statusCode: upstreamResponse.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseBody)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message || 'Failed to submit get ready.' })
    };
  }
};
