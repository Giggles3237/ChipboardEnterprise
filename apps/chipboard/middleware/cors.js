const allowedOrigins = new Set([
  'https://bopchips.netlify.app',
  'https://www.bopchips.netlify.app',
  'http://localhost:3000',
  'http://localhost:5001'
]);

const netlifyPreviewOrigin = /^https:\/\/[a-z0-9-]+--bopchips\.netlify\.app$/i;

function corsOrigin(origin, callback) {
  if (!origin || allowedOrigins.has(origin) || netlifyPreviewOrigin.test(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error('Not allowed by CORS'));
}

module.exports = corsOrigin;
