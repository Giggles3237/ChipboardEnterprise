const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const OpenAI = require('openai');
const db = require('../db');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to validate incoming data
const validateData = (data, requiredFields) => {
  return data.every(record =>
    requiredFields.every(field => field in record)
  );
};

// Helper function to consolidate vehicle data
const consolidateData = (vehicleMap, sourceData, mergeLogic) => {
  sourceData.forEach(record => {
    mergeLogic(vehicleMap, record);
  });
};

router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { keyPerData, rapidReconData, bmwData, chipboardData, searchResults, analysisType } = req.body;

    if (!analysisType || analysisType !== 'vehicle_inventory') {
      return res.status(400).json({ error: 'Invalid or missing analysis type.' });
    }

    // Initialize a map to store consolidated vehicle data
    const vehicleMap = new Map();

    // Process ChipBoard data
    if (chipboardData && validateData(chipboardData, ['Stock #', 'Vehicle', 'Make', 'Model'])) {
      consolidateData(vehicleMap, chipboardData, (map, record) => {
        const key = record['Stock #'];
        map.set(key, {
          stockNumber: record['Stock #'],
          vehicle: record.Vehicle,
          age: record.Age,
          body: record.Body,
          color: record.Color,
          interior: record.Interior,
          status: record.Status,
          price: record.Price,
          make: record.Make,
          model: record.Model
        });
      });
    }

    // Process RapidRecon data
    if (rapidReconData && validateData(rapidReconData, ['Stock No.', 'VIN', 'Mileage'])) {
      consolidateData(vehicleMap, rapidReconData, (map, record) => {
        const stockNo = record['Stock No.'];
        const existingVehicle = map.get(stockNo) || {};

        map.set(stockNo, {
          ...existingVehicle,
          vin: record.VIN,
          chassis: record.VIN?.slice(-7),
          mileage: record.Mileage,
          dateEntered: record['Date Entered'],
          lastUpdated: record['Last Updated'],
          dateCompleted: record['Date Completed'],
          recall: record.Recall
        });
      });
    }

    // Process KeyPer data
    if (keyPerData && validateData(keyPerData, ['name', 'description', 'Status'])) {
      consolidateData(vehicleMap, keyPerData, (map, record) => {
        const matchingVehicle = Array.from(map.values()).find(v =>
          v.stockNumber === record.name || (v.vin && record.description?.includes(v.vin.slice(-7)))
        );

        if (matchingVehicle) {
          const existing = map.get(matchingVehicle.stockNumber);
          map.set(matchingVehicle.stockNumber, {
            ...existing,
            keyStatus: record.Status,
            keyUser: record.User,
            keyLocation: record.Location,
            checkOutDate: record['Check-Out Date'],
            checkInDate: record['Check-In Date']
          });
        }
      });
    }

    // Consolidate data for OpenAI prompt
    const consolidatedVehicles = Array.from(vehicleMap.values());

    const systemPrompt = `
      You are an automotive data analyst providing concise vehicle summaries. consolidate this data to one vehicle, provide:
      1. Vehicle Details:
         - Make, model, and trim
         - Exterior color and interior
         - Vehicle age
      2. Key Status:
         - Current status (In/Out)
         - User who checked it out (if applicable)
         - System location
      3. Data Sources:
         - List source files where data was found
         - Most recent update date
      4. Missing Information:
         - Note any key details that are unavailable
      Format the response in clear sections with bullet points for easy reading by salespeople.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a summary for this vehicles: ${JSON.stringify(searchResults)} \n Data: ${JSON.stringify(consolidatedVehicles)}` }
      ],
      temperature: 0.2,
      max_tokens: 1000
    });

    res.json({
      analysis: response.choices[0].message.content,
      vehicles: consolidatedVehicles
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze vehicle data',
      details: error.message
    });
  }
});

module.exports = router;
