const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI('');

// Load CSV data
let soilData = [];
const dataset = [];

fs.createReadStream('dataset.csv')
  .pipe(csv())
  .on('data', (row) => {
    soilData.push(row);
  })
  .on('end', () => {
    console.log('Soil data loaded');
  });

fs.createReadStream('dataset.csv')
  .pipe(csv())
  .on('data', (data) => dataset.push(data))
  .on('end', () => console.log('Dataset loaded'));

// Serve static files
app.use(express.static('public'));


// Redirect to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint for soil analysis
app.post('/analyze', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const { soilData } = req.body;
        
        const prompt = `Given the following soil metrics, analyze the soil quality and provide:
        1. A numerical score from 0-100 for overall soil quality
        2. Detailed analysis of each parameter
        
        Soil Metrics:
        - Temperature: ${soilData.temp}°C
        - pH Level: ${soilData.ph}
        - Nitrogen Content: ${soilData.nitrogen} mg/kg
        - Phosphorus Content: ${soilData.phosphorus} mg/kg
        - Rainfall: ${soilData.rainfall} mm

        Please provide:
        1. Overall soil quality assessment
        2. Suitable crops for these conditions
        3. Specific recommendations for soil improvement
        4. Potential risks or concerns
        5. Optimal growing season suggestions`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Calculate a basic soil quality score (0-100)
        const qualityScore = calculateSoilQuality(soilData);
        
        res.json({ 
            analysis: response.text(),
            soilQualityScore: qualityScore
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function calculateSoilQuality(soilData) {
    // Ideal ranges
    const idealRanges = {
        temp: { min: 20, max: 30 },
        ph: { min: 6.0, max: 7.5 },
        nitrogen: { min: 150, max: 300 },
        phosphorus: { min: 25, max: 50 },
        rainfall: { min: 750, max: 1500 }
    };

    // Calculate score for each parameter
    const scores = {
        temp: scoreParameter(soilData.temp, idealRanges.temp),
        ph: scoreParameter(soilData.ph, idealRanges.ph),
        nitrogen: scoreParameter(soilData.nitrogen, idealRanges.nitrogen),
        phosphorus: scoreParameter(soilData.phosphorus, idealRanges.phosphorus),
        rainfall: scoreParameter(soilData.rainfall, idealRanges.rainfall)
    };

    // Return weighted average (0-100)
    return Math.round(
        (scores.temp * 0.2 + 
        scores.ph * 0.25 + 
        scores.nitrogen * 0.25 + 
        scores.phosphorus * 0.2 + 
        scores.rainfall * 0.1) * 100
    );
}

function scoreParameter(value, range) {
    if (value >= range.min && value <= range.max) return 1;
    const minDiff = Math.abs(value - range.min) / range.min;
    const maxDiff = Math.abs(value - range.max) / range.max;
    return 1 - Math.min(minDiff, maxDiff, 1);
}

// API endpoint for yield data
app.get('/yield-data', (req, res) => {
    res.json(yieldData);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
