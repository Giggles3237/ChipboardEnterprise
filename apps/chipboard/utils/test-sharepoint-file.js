const { addRowToExcel, testFileAccess, SHAREPOINT_CONFIG } = require('./graphExcel');

async function testSharePointFile() {
  console.log('🧪 Testing SharePoint Excel file access...\n');
  
  try {
    // First, test file access methods
    console.log('📋 File Information:');
    console.log(`   Domain: ${SHAREPOINT_CONFIG.domain}`);
    console.log(`   User: ${SHAREPOINT_CONFIG.userEmail}`);
    console.log(`   File ID: ${SHAREPOINT_CONFIG.fileId}`);
    console.log(`   File Name: ${SHAREPOINT_CONFIG.fileName}\n`);
    
    // Test file access
    await testFileAccess();
    
    console.log('\n📝 Testing row addition...\n');
    
    // Test data for the Excel file
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
      new Date(Date.now() + 86400000).toISOString().split('T')[0], // Due Date (tomorrow)
      "3PM",                             // Promise Time
      "test.advisor@pandwforeigncars.com", // Advisor email
      "No"                               // Sold Unit
    ];
    
    // Try adding a row using the auto method (tries all approaches)
    console.log('🔄 Trying to add row using auto method...');
    const result = await addRowToExcel(testData, 'auto');
    console.log('✅ Success! Row added:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error details:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('========================');
    console.log('1. Check Azure AD permissions:');
    console.log('   - Sites.ReadWrite.All');
    console.log('   - User.ReadWrite.All');
    console.log('   - Files.ReadWrite.All');
    console.log('');
    console.log('2. Verify the file exists and is accessible');
    console.log('3. Check if the table "Table1" exists in the Excel file');
    console.log('4. Ensure the file is not locked by another user');
  }
}

// Run the test
testSharePointFile(); 