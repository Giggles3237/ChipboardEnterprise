const { InteractiveBrowserCredential } = require("@azure/identity");
const axios = require("axios");

// Configuration for delegated authentication
const config = {
  tenantId: "fb123195-57d4-485c-8875-f5c0f8136c67",
  clientId: "58a504c8-0888-4eb1-928c-108c9d0c8083",
  redirectUri: "http://localhost:3000/auth/callback"
};

// SharePoint file information
const SHAREPOINT_CONFIG = {
  domain: "pandwbmw-my.sharepoint.com",
  userEmail: "chris.lasko@pandwforeigncars.com",
  fileId: "Ec0ILScNLXBPpvySJPg08uwBIiT90aMZ86eqbq47V5HyLg",
  fileName: "Get Ready.xlsx"
};

async function getDelegatedAccessToken() {
  try {
    // This will open a browser for user to sign in
    const credential = new InteractiveBrowserCredential({
      tenantId: config.tenantId,
      clientId: config.clientId,
      redirectUri: config.redirectUri
    });

    const tokenResponse = await credential.getToken([
      "https://graph.microsoft.com/Files.ReadWrite",
      "https://graph.microsoft.com/Sites.ReadWrite.All"
    ]);

    return tokenResponse.token;
  } catch (error) {
    console.error("Error getting delegated token:", error.message);
    throw error;
  }
}

async function addRowToExcelDelegated(values) {
  try {
    const accessToken = await getDelegatedAccessToken();
    
    // Use /me endpoint with delegated authentication
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${SHAREPOINT_CONFIG.fileId}:/workbook/tables/Table1/rows/add`;

    const body = {
      values: [values]
    };

    const res = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log("Row added via delegated auth:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error adding row to Excel via delegated auth:", error.response?.data || error.message);
    throw error;
  }
}

// Test function
async function testDelegatedAuth() {
  console.log('🔐 Testing delegated authentication...\n');
  console.log('This will open a browser window for you to sign in.');
  console.log('Please sign in with your work account (chris.lasko@pandwforeigncars.com)\n');
  
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
    
    const result = await addRowToExcelDelegated(testData);
    console.log('✅ Success! Row added:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

module.exports = { 
  addRowToExcelDelegated, 
  getDelegatedAccessToken,
  testDelegatedAuth 
}; 