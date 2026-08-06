const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.DATABASE_NAME;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: DATABASE_NAME
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Define the schema and model
const saleSchema = new mongoose.Schema({
  clientName: String,
  stockNumber: String,
  year: Number,
  make: String,
  model: String,
  color: String,
  advisor: String,
  delivered: Boolean,
  deliveryDate: Date,
  type: String
}, { collection: COLLECTION_NAME });

const Sale = mongoose.model('Sale', saleSchema);

async function verifyData() {
  try {
    const sales = await Sale.find().limit(5);
    console.log("Sample of 5 sales from the database:");
    sales.forEach(sale => {
      console.log({
        stockNumber: sale.stockNumber,
        deliveryDate: sale.deliveryDate,
        deliveryDateISO: sale.deliveryDate.toISOString(),
        deliveryDateLocal: sale.deliveryDate.toLocaleString()
      });
    });
  } catch (error) {
    console.error('Error verifying data:', error);
  } finally {
    mongoose.connection.close();
  }
}

verifyData();