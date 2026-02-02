const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Enable CORS so your index.html and admin.html can talk to this server
app.use(cors());
// Enable JSON parsing so the server can read the data you send
app.use(express.json());

// Path to your "Database" file
const DATA_FILE = './reports.json';

// Helper function to ensure reports.json exists and is valid
const initializeDatabase = () => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    }
};

// 1. ROUTE: Get all reports (Used by admin.html)
app.get('/api/reports', (req, res) => {
    try {
        initializeDatabase();
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).send({ message: "Error reading database" });
    }
});

// 2. ROUTE: Receive a new report (Used by index.html)
app.post('/api/report', (req, res) => {
    try {
        initializeDatabase();
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const reports = JSON.parse(data);
        
        const newReport = req.body;
        reports.push(newReport);
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
        console.log(`New Report Received: ${newReport.id}`);
        res.status(201).send({ message: "Report saved to server!" });
    } catch (error) {
        res.status(500).send({ message: "Error saving report" });
    }
});

// 3. ROUTE: Update Report Status (Optional - for Counselor actions)
app.patch('/api/report/:id', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        let reports = JSON.parse(data);
        const { id } = req.params;
        const { status } = req.body;

        reports = reports.map(r => r.id === id ? { ...r, status: status } : r);
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
        res.send({ message: "Status updated!" });
    } catch (error) {
        res.status(500).send({ message: "Error updating status" });
    }
});

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`CIPHER SERVER IS ACTIVE`);
    console.log(`Running at http://localhost:${PORT}`);
    console.log(`=================================`);
});