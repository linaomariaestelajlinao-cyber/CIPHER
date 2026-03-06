const express = require('express');
const mysql = require('mysql2/promise'); 
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'cipher_secret_777', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

app.use(express.static(path.join(__dirname))); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 2. DATABASE CONNECTION (FIXED) ---

const pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD, 
    // FIX 1: Changed TIDB_DB_NAME to TIDB_DATABASE to match your Render variables
    database: process.env.TIDB_DATABASE || 'test', 
    port: 4000,
    ssl: {
        // FIX 2: This is the critical line to bypass the certificate rejection
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // FIX 3: Added a connectTimeout to prevent the "Submission Failed" hang on slow networks
    connectTimeout: 10000 
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("✅ Connected to TiDB Cloud (Permanent Storage)");
        connection.release();
    } catch (err) {
        // This will now show the EXACT reason for failure in your Render logs
        console.error("❌ Database Connection Failed:", err.message); 
    }
})();

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
    const ADMIN_PASS = process.env.ADMIN_PASS || "SHS2026"; 
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.isLoggedIn = true;
        res.json({ message: "Login successful" });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

app.get('/api/reports', checkAuth, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM reports ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/report', async (req, res) => {
    const { incident_type, incident_date, description } = req.body;
    if (!incident_type || !description) {
        return res.status(400).json({ error: "Incomplete report data" });
    }
    try {
        const sql = "INSERT INTO reports (incident_type, incident_date, description) VALUES (?, ?, ?)";
        await pool.query(sql, [incident_type, incident_date, description]);
        res.status(201).json({ message: "Report successfully saved to Cloud!" });
    } catch (err) {
        console.error("Save error:", err.message);
        res.status(500).json({ error: "Server failed to save report" });
    }
});

// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🛡️  CIPHER SYSTEM BACKEND IS NOW ONLINE`);
    console.log(`📍  API URL: https://cipher-1-gyw.onrender.com/api`);
    console.log(`=========================================`);
});
