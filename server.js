const express = require('express');
const mysql = require('mysql2/promise'); 
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. MIDDLEWARE ---
app.use(cors({
    origin: '*', // Allows any website/file to talk to your backend
    methods: ['GET', 'POST'],
    credentials: true
}));
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
    database: process.env.TIDB_DATABASE || 'test',
    port: 4000,
    ssl: {
        rejectUnauthorized: false
    },
    connectTimeout: 20000,
    acquireTimeout: 20000,
    waitForConnections: true,
    connectionLimit: 1, 
    queueLimit: 0
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("✅ Connected to TiDB Cloud (Permanent Storage)");
        connection.release();
    } catch (err) {
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

// 1. LOGIN ROUTE
app.post('/api/report', async (req, res) => {
    const { incident_type, incident_date, description, reference_id, status } = req.body;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO reports (incident_type, incident_date, description, reference_id, status) VALUES (?, ?, ?, ?, ?)',
            [incident_type, incident_date, description, reference_id, status || 'Pending']
        );
        res.status(200).json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Database Insert Error:', err);
        res.status(500).json({ error: 'Failed to save report' });
    }
});
app.put('/api/report/status', async (req, res) => {
    const { reference_id, status } = req.body;
    try {
        await pool.query(
            'UPDATE reports SET status = ? WHERE reference_id = ?',
            [status, reference_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});
// 2. GET REPORTS (ADMIN PANEL)
app.get('/api/reports', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM reports ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. SUBMIT REPORT (MAIN FORM)
app.post('/api/report', async (req, res) => {
    // UPDATED: Destructure to match your frontend keys (type, date, description)
    const { type, date, description } = req.body; 

    // Validation
    if (!type || !description) {
        return res.status(400).json({ error: "Incomplete report data" });
    }

    try {
        // Map the frontend 'type' to your database 'incident_type'
        const sql = "INSERT INTO reports (incident_type, incident_date, description) VALUES (?, ?, ?)";
        await pool.query(sql, [type, date, description]);
        
        console.log("✅ Report saved to TiDB");
        res.status(201).json({ message: "Report successfully saved to Cloud!" });
    } catch (err) {
        console.error("❌ SQL Save Error:", err.message);
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



