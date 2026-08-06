const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

const INPUT_CSV = path.join(__dirname, 'salesData.csv');
const OUTPUT_JSON = path.join(__dirname, 'salesData.json');

// Function to convert Excel date serial number to ISO date string
function excelDateToISOString(serial) {
  const utcDays = serial - 25569;
  const milliseconds = utcDays * 86400000;
  const date = new Date(milliseconds);
  return date.toISOString().split('T')[0];
}

async function processCSV() {
  let existingSales = [];
  try {
    const data = await fs.readFile(OUTPUT_JSON, 'utf8');
    existingSales = JSON.parse(data);
    console.log(`Loaded ${existingSales.length} existing sales from ${OUTPUT_JSON}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error reading existing sales data:', error);
    } else {
      console.log(`${OUTPUT_JSON} does not exist. Will create a new file.`);
    }
  }

  const salesMap = new Map(existingSales.map(sale => [sale.id, { ...sale, delivered: true }]));

  let newSales = 0;
  let updatedSales = 0;

  await new Promise((resolve, reject) => {
    createReadStream(INPUT_CSV)
      .pipe(csv({
        mapValues: ({ header, index, value }) => value.trim()
      }))
      .on('data', (row) => {
        const columns = Object.values(row);
        
        const sale = {
          id: columns[5] || '', // stockNumber as id
          clientName: columns[7] || '',
          stockNumber: columns[5] || '',
          year: parseInt(columns[1] || '0'),
          make: columns[2] || '',
          model: columns[3] || '',
          color: columns[4] || '',
          advisor: columns[6] || '',
          delivered: true, // Always set to true
          deliveryDate: columns[0] || '',
          type: columns[9] || ''
        };

        // Convert Excel date to ISO string
        if (sale.deliveryDate && !isNaN(sale.deliveryDate)) {
          sale.deliveryDate = excelDateToISOString(parseFloat(sale.deliveryDate));
        }

        if (salesMap.has(sale.id)) {
          // Update existing sale, ensuring delivered is true
          salesMap.set(sale.id, { ...salesMap.get(sale.id), ...sale, delivered: true });
          updatedSales++;
        } else {
          // Add new sale
          salesMap.set(sale.id, sale);
          newSales++;
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  const updatedSalesData = Array.from(salesMap.values());

  await fs.writeFile(OUTPUT_JSON, JSON.stringify(updatedSalesData, null, 2));
  console.log(`Data has been written to ${OUTPUT_JSON}`);
  console.log(`Total records: ${updatedSalesData.length}`);
  console.log(`New sales added: ${newSales}`);
  console.log(`Existing sales updated: ${updatedSales}`);
}

processCSV().catch(console.error);