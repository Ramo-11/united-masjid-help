const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const dbPath = process.env.NODE_ENV === 'production' ? '/data/pantry.db' : 'pantry.db';
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

  CREATE TABLE IF NOT EXISTS media_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cloudinary_id TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    group_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS external_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS food_item_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pantry TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    unit TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pantry, category)
);

CREATE TABLE IF NOT EXISTS food_item_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pantry TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    week_start DATE NOT NULL
);

`);

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

// Initialize default pantry goals
const initGoals = db.prepare(`INSERT OR IGNORE INTO pantry_goals (pantry, goal) VALUES (?, ?)`);
initGoals.run('almumineen', 500);
initGoals.run('alfajr', 500);
initGoals.run('alhuda', 500);

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

// Import controllers
const donationController = require('./controllers/donationController');
const volunteerController = require('./controllers/volunteerController');
const mediaController = require('./controllers/mediaController');
const authController = require('./controllers/authController');

// API Routes

// Donation routes
app.get('/api/pantries', donationController.getAllPantries);
app.post('/api/admin/goal/:pantry', donationController.updateGoal);
app.post('/api/donations', donationController.recordDonation);
app.get('/api/donations', donationController.getDonationHistory);
app.delete('/api/admin/donations/:pantry', donationController.clearDonations);
app.post('/api/admin/food-goals', donationController.setFoodItemGoal);
app.get('/api/food-goals/:pantry', donationController.getFoodItemGoals);
app.delete('/api/admin/food-goals/:pantry/:category', donationController.deleteFoodItemGoal);
app.post('/api/food-achievements', donationController.recordFoodItemAchievement);
app.post('/api/admin/food-goals/contribute', donationController.recordFoodItemContribution);
app.post('/api/admin/food-goals/complete', donationController.markFoodGoalComplete);
app.get('/api/admin/food-history/:pantry', donationController.getFoodItemHistory);

// Volunteer routes
app.get('/api/slots', volunteerController.getAllSlots);
app.get('/api/admin/all-slots', volunteerController.getAllSlotsAdmin);
app.post('/api/admin/slots', volunteerController.addSlot);
app.delete('/api/admin/slots/:id', volunteerController.deleteSlot);
app.post('/api/volunteers', volunteerController.registerVolunteer);
app.get('/api/admin/volunteers', volunteerController.getAllVolunteers);
app.delete('/api/admin/volunteers/:slotId', volunteerController.clearVolunteers);
app.put('/api/admin/slots/:id', volunteerController.updateSlot);
app.post('/api/admin/slots/:id/complete', volunteerController.markSlotComplete);

// Media routes
app.get('/api/media', mediaController.getAllMedia);
app.post('/api/admin/media', upload.array('files', 20), mediaController.uploadMedia);
app.delete('/api/admin/media/group/:groupId', mediaController.deleteMediaGroup);
app.get('/api/external-links', mediaController.getAllExternalLinks);
app.post('/api/admin/external-links', mediaController.addExternalLink);
app.delete('/api/admin/external-links/:id', mediaController.deleteExternalLink);

// Auth routes
app.post('/api/admin/verify', authController.verifyAdmin);
app.get('/api/admin/check', authController.checkAdmin);
app.post('/api/admin/logout', authController.logout);

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

app.get('/media.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'media.html'));
});

app.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Food Pantry Tracker running on http://localhost:${PORT}`);
});
