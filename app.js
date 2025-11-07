const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const dbPath =
    process.env.NODE_ENV === 'production' ? path.join(__dirname, 'pantry.db') : 'pantry.db';
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS pantry_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pantry TEXT UNIQUE NOT NULL,
    goal INTEGER NOT NULL DEFAULT 500
  );

  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pantry TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    items TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS volunteer_slots (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    address TEXT,
    type TEXT NOT NULL,
    max_volunteers INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS volunteers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES volunteer_slots(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS weekly_totals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pantry TEXT NOT NULL,
    week_start DATE NOT NULL,
    total REAL NOT NULL DEFAULT 0,
    UNIQUE(pantry, week_start)
  );
`);

// Initialize default pantry goals
const initGoals = db.prepare(`
  INSERT OR IGNORE INTO pantry_goals (pantry, goal) VALUES (?, ?)
`);

initGoals.run('almumineen', 500);
initGoals.run('alfajr', 500);
initGoals.run('alhuda', 500);

// Admin password
const ADMIN_PASSWORD = 'admin123'; // Change this!

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        store: new SqliteStore({
            client: db,
            expired: {
                clear: true,
                intervalMs: 900000,
            },
        }),
        secret: 'pantry-secret-key-2025',
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 365 * 24 * 60 * 60 * 1000 },
    })
);

// Helper functions
function getMonday(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

function getCurrentWeekTotal(pantry) {
    const weekStart = getMonday();
    const stmt = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM donations 
        WHERE pantry = ? AND DATE(created_at) >= ?
    `);
    const result = stmt.get(pantry, weekStart);
    return result.total;
}

// API Routes

// Get all pantry data
app.get('/api/pantries', (req, res) => {
    const goals = db.prepare('SELECT * FROM pantry_goals').all();
    const pantries = goals.map((g) => ({
        pantry: g.pantry,
        goal: g.goal,
        current: getCurrentWeekTotal(g.pantry),
    }));
    res.json(pantries);
});

// Update pantry goal (admin)
app.post('/api/admin/goal/:pantry', (req, res) => {
    if (!req.body.password || req.body.password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pantry } = req.params;
    const { goal } = req.body;

    const stmt = db.prepare('UPDATE pantry_goals SET goal = ? WHERE pantry = ?');
    stmt.run(goal, pantry);

    res.json({ success: true });
});

// Record donation
app.post('/api/donations', (req, res) => {
    const { pantry, amount, type, items } = req.body;

    const stmt = db.prepare(`
        INSERT INTO donations (pantry, amount, type, items)
        VALUES (?, ?, ?, ?)
    `);

    const itemsJson = items ? JSON.stringify(items) : null;
    stmt.run(pantry, amount, type, itemsJson);

    res.json({ success: true, current: getCurrentWeekTotal(pantry) });
});

// Get donation history
app.get('/api/donations', (req, res) => {
    const { pantry } = req.query;

    let query = 'SELECT * FROM donations ORDER BY created_at DESC';
    let stmt;

    if (pantry && pantry !== 'all') {
        query = 'SELECT * FROM donations WHERE pantry = ? ORDER BY created_at DESC';
        stmt = db.prepare(query);
        const donations = stmt.all(pantry);
        res.json(donations);
    } else {
        stmt = db.prepare(query);
        const donations = stmt.all();
        res.json(donations);
    }
});

// Clear donations for specific pantry (admin)
app.delete('/api/admin/donations/:pantry', (req, res) => {
    if (!req.body.password || req.body.password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pantry } = req.params;

    if (pantry === 'all') {
        db.prepare('DELETE FROM donations').run();
    } else {
        db.prepare('DELETE FROM donations WHERE pantry = ?').run(pantry);
    }

    res.json({ success: true });
});

// Get all volunteer slots
app.get('/api/slots', (req, res) => {
    const slots = db.prepare('SELECT * FROM volunteer_slots ORDER BY date ASC').all();

    const slotsWithCounts = slots.map((slot) => {
        const count = db
            .prepare('SELECT COUNT(*) as count FROM volunteers WHERE slot_id = ?')
            .get(slot.id).count;
        return { ...slot, signupCount: count };
    });

    res.json(slotsWithCounts);
});

// Add volunteer slot (admin)
app.post('/api/admin/slots', (req, res) => {
    if (!req.body.password || req.body.password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, date, time, location, address, type, maxVolunteers } = req.body;

    const stmt = db.prepare(`
        INSERT INTO volunteer_slots (id, date, time, location, address, type, max_volunteers)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, date, time, location, address || '', type, maxVolunteers);

    res.json({ success: true });
});

// Delete volunteer slot (admin)
app.delete('/api/admin/slots/:id', (req, res) => {
    if (!req.body.password || req.body.password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Delete volunteers for this slot
    db.prepare('DELETE FROM volunteers WHERE slot_id = ?').run(id);
    // Delete the slot
    db.prepare('DELETE FROM volunteer_slots WHERE id = ?').run(id);

    res.json({ success: true });
});

// Clear volunteers for specific slot (admin)
app.delete('/api/admin/volunteers/:slotId', (req, res) => {
    if (!req.body.password || req.body.password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slotId } = req.params;

    if (slotId === 'all') {
        db.prepare('DELETE FROM volunteers').run();
    } else {
        db.prepare('DELETE FROM volunteers WHERE slot_id = ?').run(slotId);
    }

    res.json({ success: true });
});

// Register volunteer
app.post('/api/volunteers', (req, res) => {
    const { slotId, name, email, phone } = req.body;

    // Check if slot is full
    const slot = db.prepare('SELECT max_volunteers FROM volunteer_slots WHERE id = ?').get(slotId);
    const count = db
        .prepare('SELECT COUNT(*) as count FROM volunteers WHERE slot_id = ?')
        .get(slotId).count;

    if (count >= slot.max_volunteers) {
        return res.status(400).json({ error: 'Slot is full' });
    }

    const stmt = db.prepare(`
        INSERT INTO volunteers (slot_id, name, email, phone)
        VALUES (?, ?, ?, ?)
    `);

    stmt.run(slotId, name, email, phone);

    res.json({ success: true });
});

// Get all volunteers (admin)
app.get('/api/admin/volunteers', (req, res) => {
    const volunteers = db
        .prepare(
            `
        SELECT v.*, s.date, s.time, s.location, s.type
        FROM volunteers v
        JOIN volunteer_slots s ON v.slot_id = s.id
        ORDER BY s.date ASC, v.created_at ASC
    `
        )
        .all();

    res.json(volunteers);
});

// Verify admin password
app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
        req.session.adminAuthenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Check admin authentication
app.get('/api/admin/check', (req, res) => {
    res.json({ authenticated: req.session.adminAuthenticated === true });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.adminAuthenticated = false;
    res.json({ success: true });
});

// Serve static HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/donate.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'donate.html'));
});

app.get('/volunteer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'volunteer.html'));
});

app.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Food Pantry Tracker running on http://localhost:${PORT}`);
});
