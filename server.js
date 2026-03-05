const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
const path = require('path'); // FIXED: Added this missing line
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'cipher_ultra_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// FIXED: Pointing to your actual folder name from your screenshots
app.use(express.static(path.join(__dirname))); 

// FIXED: Ensuring the home page loads your index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 2. DATABASE CONNECTION ---
const connection = mysql.createConnection({
    host: process.env.TIDB_HOST || 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
    user: process.env.TIDB_USER || 'idkpoF3Ar1v2D8F.root',
    password: process.env.TIDB_PASSWORD, 
    database: process.env.TIDB_DB_NAME || 'test',
    port: 4000,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

connection.connect((err) => {
    if (err) return console.error("❌ Database Connection Failed:", err.message);
    console.log("✅ Connected to TiDB Cloud (Permanent Storage)");
});

// --- 3. AUTHENTICATION MIDDLEWARE ---
const checkAuth = (req, res, next) => {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized. Please log in." });
    }
};

// --- 4. API ROUTES ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const ADMIN_USER = "admin"; 
    const ADMIN_PASS = process.env.ADMIN_PASS || "stc_tandag_2026";

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isLoggedIn = true;
        res.json({ message: "Login successful" });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

app.get('/api/reports', checkAuth, (req, res) => {
    const sql = "SELECT * FROM reports ORDER BY created_at DESC";
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/report', (req, res) => {
    const { incident_type, incident_date, description } = req.body;
    if (!incident_type || !description) {
        return res.status(400).json({ error: "Incomplete report data" });
    }
    const sql = "INSERT INTO reports (incident_type, incident_date, description) VALUES (?, ?, ?)";
    connection.query(sql, [incident_type, incident_date, description], (err, result) => {
        if (err) return res.status(500).json({ error: "Server failed to save report" });
        res.status(201).json({ message: "Report successfully saved to Cloud!" });
    });
});

// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🛡️  CIPHER SYSTEM BACKEND IS NOW ONLINE`);
    console.log(`📍  API URL: https://cipher-1-gyw.onrender.com/api`);
    console.log(`=========================================`);
});
