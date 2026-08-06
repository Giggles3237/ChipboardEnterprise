const nodemailer = require("nodemailer");

function buildEmailConfig() {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_SECURE,
    EMAIL_SERVICE,
    EMAIL_USER,
    EMAIL_PASSWORD,
    EMAIL_REQUIRE_TLS,
    EMAIL_TLS_REJECT_UNAUTHORIZED
  } = process.env;

  const parsedPort = EMAIL_PORT ? parseInt(EMAIL_PORT, 10) : undefined;
  const parsedSecure = typeof EMAIL_SECURE === 'string' ? EMAIL_SECURE === 'true' : undefined;
  const rejectUnauthorized = EMAIL_TLS_REJECT_UNAUTHORIZED
    ? EMAIL_TLS_REJECT_UNAUTHORIZED === 'true'
    : false;

  const authUser = EMAIL_USER;
  const authPass = EMAIL_PASSWORD;

  if (!authUser || !authPass) {
    throw new Error('Email credentials are not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
  }

  // Allow either explicit host configuration or nodemailer's service lookup
  if (EMAIL_HOST) {
    return {
      host: EMAIL_HOST,
      port: parsedPort || 587,
      secure: typeof parsedSecure === 'boolean' ? parsedSecure : (parsedPort === 465),
      requireTLS: EMAIL_REQUIRE_TLS ? EMAIL_REQUIRE_TLS === 'true' : true,
      auth: {
        user: authUser,
        pass: authPass
      },
      tls: {
        rejectUnauthorized
      }
    };
  }

  const config = {
    service: EMAIL_SERVICE || "gmail",
    auth: {
      user: authUser,
      pass: authPass
    },
    tls: {
      rejectUnauthorized
    }
  };

  if (parsedPort) {
    config.port = parsedPort;
  }

  if (typeof parsedSecure === 'boolean') {
    config.secure = parsedSecure;
  }

  return config;
}

let emailConfig;

try {
  emailConfig = buildEmailConfig();
} catch (error) {
  console.error('[GetReadyEmail] Email configuration error:', error.message);
  emailConfig = null;
}

const fromAddress = process.env.EMAIL_FROM || (emailConfig?.auth?.user ? `"Chipboard System" <${emailConfig.auth.user}>` : null);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function buildGetReadyRecipients(data, recipients = []) {
  const defaultRecipients = [
    "chris.lasko@pandwforeigncars.com",
    "get.ready@pandwforeigncars.com"
  ];

  const toRecipients = recipients.length > 0 ? [...recipients] : [...defaultRecipients];
  const addRecipient = (email) => {
    if (typeof email !== 'string' || !email.includes('@')) {
      return;
    }

    const trimmedEmail = email.trim();
    const alreadyIncluded = toRecipients.some((recipient) => (
      recipient.toLowerCase() === trimmedEmail.toLowerCase()
    ));

    if (!alreadyIncluded) {
      toRecipients.push(trimmedEmail);
    }
  };

  addRecipient(data.salesperson);
  addRecipient(data.salespersonEmail);

  return toRecipients;
}

function formatItemsNeeded(itemsNeeded) {
  if (!Array.isArray(itemsNeeded) || itemsNeeded.length === 0) {
    return 'None listed';
  }

  return itemsNeeded.join(', ');
}

function formatGetReadyEmail(data) {
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
    escalationUrl
  } = data;

  const emailSubject = `${getReadyId}*SOLD UNIT* GET READY - REPLY ALL FOR STATUS UPDATES`;
  const submittedAt = new Date().toLocaleString();
  const htmlFields = {
    getReadyId: escapeHtml(getReadyId),
    dueBy: escapeHtml(dueBy),
    chassis: escapeHtml(chassis),
    vehicle: escapeHtml(vehicle),
    location: escapeHtml(location),
    miles: escapeHtml(miles || ''),
    itemsNeeded: escapeHtml(formatItemsNeeded(itemsNeeded)),
    additionalAction: escapeHtml(additionalAction || 'Check for Open Campaigns'),
    comments: escapeHtml(comments || ''),
    customerName: escapeHtml(customerName),
    salesperson: escapeHtml(salesperson),
    submittedBy: escapeHtml(submittedBy),
    submittedAt: escapeHtml(submittedAt),
    escalationUrl: escapeHtml(escalationUrl || '')
  };
  
  const emailBody = `
This is a Get Ready for a sold unit. Please Reply All to this email with updates to the vehicles status.

Stock Number: ${getReadyId}
Due By: ${dueBy}
Chassis: ${chassis}
Vehicle: ${vehicle}
Location: ${location}
Miles: ${miles || ''}
Items Needed: ${JSON.stringify(itemsNeeded)}
Additional Action: ${additionalAction || 'Check for Open Campaigns'}
Comments: ${comments}
Customer Name: ${customerName}
Salesperson: ${salesperson}
Submitted By: ${submittedBy} @ ${submittedAt}
${escalationUrl ? `\nEscalate this Get Ready: ${escalationUrl}` : ''}
  `.trim();

  const escalationButtonHtml = escalationUrl ? `
    <tr>
      <td style="padding: 22px 0 8px;">
        <a href="${htmlFields.escalationUrl}" style="display: inline-block; background: #b91c1c; color: #ffffff; font-weight: 800; text-decoration: none; padding: 14px 22px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.4px;">
          Escalate This Get Ready
        </a>
      </td>
    </tr>
    <tr>
      <td style="font-size: 13px; color: #7f1d1d; padding-bottom: 12px;">
        Use this if the email thread is getting buried or the unit needs urgent attention.
      </td>
    </tr>
  ` : '';

  const emailHtml = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.45;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 720px; border-collapse: collapse;">
        <tr>
          <td style="background: #1f2937; color: #ffffff; padding: 18px 20px; font-size: 20px; font-weight: 800;">
            Sold Unit Get Ready
          </td>
        </tr>
        <tr>
          <td style="border: 1px solid #d1d5db; border-top: 0; padding: 18px 20px;">
            <p style="margin: 0 0 16px;">This is a Get Ready for a sold unit. Please Reply All to this email with updates to the vehicle's status.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <tr><td style="padding: 7px 0; font-weight: 700; width: 160px;">Stock Number:</td><td style="padding: 7px 0;">${htmlFields.getReadyId}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Due By:</td><td style="padding: 7px 0;">${htmlFields.dueBy}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Chassis:</td><td style="padding: 7px 0;">${htmlFields.chassis}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Vehicle:</td><td style="padding: 7px 0;">${htmlFields.vehicle}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Location:</td><td style="padding: 7px 0;">${htmlFields.location}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Miles:</td><td style="padding: 7px 0;">${htmlFields.miles}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Items Needed:</td><td style="padding: 7px 0;">${htmlFields.itemsNeeded}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Additional Action:</td><td style="padding: 7px 0;">${htmlFields.additionalAction}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Comments:</td><td style="padding: 7px 0;">${htmlFields.comments}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Customer Name:</td><td style="padding: 7px 0;">${htmlFields.customerName}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Salesperson:</td><td style="padding: 7px 0;">${htmlFields.salesperson}</td></tr>
              <tr><td style="padding: 7px 0; font-weight: 700;">Submitted By:</td><td style="padding: 7px 0;">${htmlFields.submittedBy} @ ${htmlFields.submittedAt}</td></tr>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              ${escalationButtonHtml}
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return {
    subject: emailSubject,
    body: emailBody,
    html: emailHtml
  };
}

function formatEscalationEmail(data) {
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
    escalatedBy,
    escalationComments
  } = data;

  const stockNumber = getReadyId || 'Unknown stock';
  const subject = `Urgent, ${stockNumber} has been escalated.`;
  const sentAt = new Date().toLocaleString();
  const htmlFields = {
    stockNumber: escapeHtml(stockNumber),
    dueBy: escapeHtml(dueBy),
    chassis: escapeHtml(chassis),
    vehicle: escapeHtml(vehicle),
    location: escapeHtml(location),
    miles: escapeHtml(miles || ''),
    itemsNeeded: escapeHtml(formatItemsNeeded(itemsNeeded)),
    additionalAction: escapeHtml(additionalAction || 'Check for Open Campaigns'),
    comments: escapeHtml(comments || ''),
    customerName: escapeHtml(customerName),
    salesperson: escapeHtml(salesperson),
    submittedBy: escapeHtml(submittedBy),
    escalationComments: escapeHtml(escalationComments || 'No additional escalation comments provided.'),
    sentAt: escapeHtml(sentAt)
  };
  const body = `
URGENT GET READY ESCALATION

${stockNumber} has been escalated and needs immediate attention.

Stock Number: ${stockNumber}
Due By: ${dueBy}
Vehicle: ${vehicle}
Customer Name: ${customerName}
Location: ${location}
Chassis: ${chassis}
Miles: ${miles || ''}
Items Needed: ${formatItemsNeeded(itemsNeeded)}
Additional Action: ${additionalAction || 'Check for Open Campaigns'}
Comments: ${comments || ''}
Escalation Comments: ${escalationComments || 'No additional escalation comments provided.'}
Salesperson: ${salesperson}
Original Submitted By: ${submittedBy}
Escalated By: ${escalatedBy || 'Escalation button'}
Escalated At: ${sentAt}
  `.trim();

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.45;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 760px; border-collapse: collapse; border: 4px solid #b91c1c;">
        <tr>
          <td style="background: #b91c1c; color: #ffffff; padding: 20px 24px; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">
            Urgent Get Ready Escalation
          </td>
        </tr>
        <tr>
          <td style="background: #fee2e2; color: #7f1d1d; padding: 18px 24px; font-size: 22px; font-weight: 900;">
            ${htmlFields.stockNumber} has been escalated and needs immediate attention.
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <tr><td style="padding: 9px 0; font-weight: 800; width: 170px; border-bottom: 1px solid #e5e7eb;">Stock Number:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.stockNumber}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Due By:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.dueBy}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Vehicle:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.vehicle}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Customer:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.customerName}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Location:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.location}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Chassis:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.chassis}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Miles:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.miles}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Items Needed:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.itemsNeeded}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Additional Action:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.additionalAction}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Comments:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.comments}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Escalation Comments:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.escalationComments}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Salesperson:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.salesperson}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800; border-bottom: 1px solid #e5e7eb;">Submitted By:</td><td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb;">${htmlFields.submittedBy}</td></tr>
              <tr><td style="padding: 9px 0; font-weight: 800;">Escalated At:</td><td style="padding: 9px 0;">${htmlFields.sentAt}</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  return { subject, body, html };
}

async function sendGetReadyEmail(data, recipients = [], senderEmail = null) {
  try {
    if (!emailConfig) {
      throw new Error('Email transporter is not configured. Check server email environment variables.');
    }

    // Create transporter
    const transporter = nodemailer.createTransport(emailConfig);

    // Verify transporter configuration to surface connection issues early
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.warn('[GetReadyEmail] Transport verify failed:', verifyError.message);
    }

    // Format email
    const { subject, body, html } = formatGetReadyEmail(data);
    const toRecipients = buildGetReadyRecipients(data, recipients);
    
    // Log recipients for troubleshooting
    console.log('[GetReadyEmail] To recipients:', toRecipients);
    if (senderEmail) {
      console.log('[GetReadyEmail] CC (sender):', senderEmail);
    }

    // Email content
    const mailOptions = {
      from: fromAddress || emailConfig.auth.user,
      to: toRecipients.join(', '),
      subject: subject,
      text: body,
      html,
      // Add headers to improve deliverability
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Chipboard System'
      }
    };
    
    // Add sender to CC if provided
    if (senderEmail) {
      mailOptions.cc = senderEmail;
    }
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Get Ready email sent successfully:", info.messageId);
    return {
      messageId: info.messageId,
      to: toRecipients,
      cc: senderEmail || null
    };
    
  } catch (error) {
    console.error("❌ Error sending Get Ready email:", error.message);
    throw error;
  }
}

async function sendGetReadyEscalationEmail(data, recipients = [], senderEmail = null) {
  try {
    if (!emailConfig) {
      throw new Error('Email transporter is not configured. Check server email environment variables.');
    }

    const transporter = nodemailer.createTransport(emailConfig);

    try {
      await transporter.verify();
    } catch (verifyError) {
      console.warn('[GetReadyEmail] Transport verify failed:', verifyError.message);
    }

    const { subject, body, html } = formatEscalationEmail(data);
    const toRecipients = buildGetReadyRecipients(data, recipients);

    console.log('[GetReadyEmail] Escalation to recipients:', toRecipients);
    if (senderEmail) {
      console.log('[GetReadyEmail] Escalation CC (sender):', senderEmail);
    }

    const mailOptions = {
      from: fromAddress || emailConfig.auth.user,
      to: toRecipients.join(', '),
      subject,
      text: body,
      html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Chipboard System'
      }
    };

    if (senderEmail) {
      mailOptions.cc = senderEmail;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("Get Ready escalation email sent successfully:", info.messageId);
    return {
      messageId: info.messageId,
      to: toRecipients,
      cc: senderEmail || null
    };
  } catch (error) {
    console.error("Error sending Get Ready escalation email:", error.message);
    throw error;
  }
}

// Function to convert your existing data format to Get Ready format
function convertToGetReadyFormat(excelData) {
  return {
    getReadyId: excelData[5] || "PB" + Math.random().toString(36).substr(2, 4).toUpperCase(), // Stock#
    dueBy: excelData[14] + " at " + excelData[15], // Due Date + Promise Time
    chassis: excelData[9] || "", // Chassis
    vehicle: excelData[8] + " " + excelData[10], // Model + Color
    location: excelData[6] || "DETAIL", // Location
    miles: excelData[11] || "", // Miles
    itemsNeeded: excelData[12] ? excelData[12].split(';') : [], // Instructions
    additionalAction: "Check for Open Campaigns",
    comments: excelData[13] || "", // Comments
    customerName: excelData[7] || "", // Customer Name
    salesperson: excelData[16] || "chris.lasko@pandwforeigncars.com", // Advisor email
    submittedBy: excelData[3] || "chris.lasko@pandwforeigncars.com" // Email
  };
}

// Test function
async function testGetReadyEmail() {
  console.log('📧 Testing Get Ready email...\n');
  
  try {
    // Test data in your Excel format
    const testExcelData = [
      "",                                // ID
      new Date().toISOString(),          // Start Time
      new Date().toISOString(),          // Completion Time
      "chris.lasko@pandwforeigncars.com", // Email
      "Chris Lasko",                    // Name
      "PB9999",                         // Stock#
      "Detail",                          // Location
      "Test Customer",                   // Customer Name
      "X5",                              // Model
      "WBA123456789",                   // Chassis
      "Black",                           // Color
      "15000",                          // Miles
      "Fuel;Fluff",                     // Instructions
      "Test comment",                    // Comments
      "2025-07-30",                     // Due Date
      "2PM",                            // Promise Time
      "mike.diaz@pandwforeigncars.com", // Advisor email
      "Yes"                              // Sold Unit
    ];
    
    // Convert to Get Ready format
    const getReadyData = convertToGetReadyFormat(testExcelData);
    
    console.log('📋 Get Ready Data:');
    console.log(JSON.stringify(getReadyData, null, 2));
    
    // Send email
    const result = await sendGetReadyEmail(getReadyData, [
      "chris.lasko@pandwforeigncars.com"
    ]);
    
    console.log('✅ Get Ready email sent successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 To fix email issues:');
    console.log('1. Update emailConfig with your SMTP settings');
    console.log('2. Set your email password in the config');
    console.log('3. Or use Gmail with app passwords');
  }
}

// Function to integrate with your existing system
async function addRowToExcelViaGetReadyEmail(values, recipients = []) {
  try {
    const getReadyData = convertToGetReadyFormat(values);
    const result = await sendGetReadyEmail(getReadyData, recipients);
    console.log("Row data sent via Get Ready email:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending row data via Get Ready email:", error.message);
    throw error;
  }
}

module.exports = { 
  sendGetReadyEmail,
  sendGetReadyEscalationEmail,
  addRowToExcelViaGetReadyEmail,
  convertToGetReadyFormat,
  testGetReadyEmail,
  formatGetReadyEmail,
  formatEscalationEmail,
  buildGetReadyRecipients,
  escapeHtml
}; 
