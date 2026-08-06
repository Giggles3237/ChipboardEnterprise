const nodemailer = require("nodemailer");

// Gmail configuration (easier to set up)
const gmailConfig = {
  service: "gmail",
  auth: {
    user: "your.email@gmail.com", // Replace with your Gmail
    pass: "YOUR_APP_PASSWORD" // Gmail app password (not regular password)
  }
};

// Excel data structure
const EXCEL_COLUMNS = [
  "ID", "Start Time", "Completion Time", "Email", "Name", 
  "Stock#", "Location", "Customer Name", "Model", "Chassis", 
  "Color", "Miles", "Instructions", "Comments", "Due Date", 
  "Promise Time", "Advisor email", "Sold Unit"
];

function formatExcelDataAsTable(data) {
  let tableHTML = `
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          ${EXCEL_COLUMNS.map(col => `<th>${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          ${data.map(cell => `<td>${cell || ''}</td>`).join('')}
        </tr>
      </tbody>
    </table>
  `;
  
  return tableHTML;
}

function formatExcelDataAsCSV(data) {
  const csvHeader = EXCEL_COLUMNS.join(',');
  const csvRow = data.map(cell => `"${cell || ''}"`).join(',');
  return `${csvHeader}\n${csvRow}`;
}

async function sendExcelDataViaGmail(data, options = {}) {
  try {
    // Create transporter
    const transporter = nodemailer.createTransporter(gmailConfig);
    
    // Format data
    const tableHTML = formatExcelDataAsTable(data);
    const csvData = formatExcelDataAsCSV(data);
    
    // Email content
    const mailOptions = {
      from: gmailConfig.auth.user,
      to: options.to || "chris.lasko@pandwforeigncars.com", // Send to your work email
      cc: options.cc || "",
      bcc: options.bcc || "",
      subject: options.subject || `Excel Data Entry - ${new Date().toLocaleDateString()}`,
      html: `
        <h2>New Excel Data Entry</h2>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Submitted by:</strong> ${data[3] || 'Unknown'}</p>
        
        <h3>Data:</h3>
        ${tableHTML}
        
        <p><em>This data can be copied and pasted into your Excel file.</em></p>
        
        <h3>Instructions:</h3>
        <ol>
          <li>Open your Excel file</li>
          <li>Copy the data from the table above</li>
          <li>Paste it into a new row in your Excel file</li>
          <li>Or use the attached CSV file</li>
        </ol>
      `,
      attachments: [
        {
          filename: `excel_data_${new Date().toISOString().split('T')[0]}.csv`,
          content: csvData
        }
      ]
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return info;
    
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    throw error;
  }
}

// Test function
async function testGmailExcel() {
  console.log('📧 Testing Gmail Excel data...\n');
  
  try {
    const testData = [
      "",                                // ID
      new Date().toISOString(),          // Start Time
      new Date().toISOString(),          // Completion Time
      "test@pandwforeigncars.com",       // Email
      "Test User",                       // Name
      "TEST123",                         // Stock#
      "Detail",                          // Location
      "Test Customer",                   // Customer Name
      "X5",                              // Model
      "TEST123456789",                   // Chassis
      "White",                           // Color
      "10000",                           // Miles
      "Test instructions",               // Instructions
      "Test comment",                    // Comments
      new Date(Date.now() + 86400000).toISOString().split('T')[0], // Due Date
      "3PM",                             // Promise Time
      "test.advisor@pandwforeigncars.com", // Advisor email
      "No"                               // Sold Unit
    ];
    
    const result = await sendExcelDataViaGmail(testData, {
      to: "chris.lasko@pandwforeigncars.com",
      subject: "Test Excel Data Entry"
    });
    
    console.log('✅ Email sent successfully!');
    console.log('📋 You can copy the data from the email into your Excel file.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 To set up Gmail:');
    console.log('1. Create a Gmail account or use existing one');
    console.log('2. Enable 2-factor authentication');
    console.log('3. Generate an "App Password"');
    console.log('4. Update gmailConfig with your email and app password');
  }
}

// Function to integrate with your existing system
async function addRowToExcelViaGmail(values, emailOptions = {}) {
  try {
    const result = await sendExcelDataViaGmail(values, emailOptions);
    console.log("Row data sent via Gmail:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending row data via Gmail:", error.message);
    throw error;
  }
}

module.exports = { 
  sendExcelDataViaGmail,
  addRowToExcelViaGmail,
  testGmailExcel,
  formatExcelDataAsTable,
  formatExcelDataAsCSV
}; 