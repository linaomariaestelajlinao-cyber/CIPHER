const express = require('express');
const mysql = require('mysql2/promise'); 
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. MIDDLEWARE (FIXED TO ALLOW PUT) ---
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT'], // ADDED 'PUT' HERE
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

// --- 2. DATABASE CONNECTION ---
const pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE || 'test',
    port: 4000,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
    acquireTimeout: 20000,
    waitForConnections: true,
    connectionLimit: 1, 
    queueLimit: 0
});

// --- 3. API ROUTES ---

// MERGED SUBMIT ROUTE (Prevents Duplication Error)
app.post('/api/report', async (req, res) => {
    const { incident_type, incident_date, description, reference_id, status, type, date } = req.body;
    
    // Support both frontend naming styles (type/date vs incident_type/incident_date)
    const finalType = incident_type || type;
    const finalDate = incident_date || date;

    try {
        const [result] = await pool.query(
            'INSERT INTO reports (incident_type, incident_date, description, reference_id, status) VALUES (?, ?, ?, ?, ?)',
            [finalType, finalDate, description, reference_id, status || 'Pending']
        );
        res.status(200).json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('❌ SQL Save Error:', err.message);
        res.status(500).json({ error: 'Failed to save report' });
    }
});

// UPDATE STATUS ROUTE (The Resolve Button)
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

// GET REPORTS (Admin & Student Dashboard)
app.get('/api/reports', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM reports ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 4. START SERVER ---
app.listen(PORT, () => {
    console.log(`🛡️  CIPHER SYSTEM BACKEND IS ONLINE`);
    console.log(`📍  API URL: https://cipher-1-gyw.onrender.com/api`);
    console.log(`=========================================`);
});




