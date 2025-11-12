const Database = require('better-sqlite3');
const dbPath = process.env.NODE_ENV === 'production' ? '/data/pantry.db' : 'pantry.db';
const db = new Database(dbPath);

// Helper function to get Monday
function getMonday(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

// Helper function to get current week total
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

// Get all pantry data
exports.getAllPantries = (req, res) => {
    const goals = db.prepare('SELECT * FROM pantry_goals').all();
    const pantries = goals.map((g) => ({
        pantry: g.pantry,
        goal: g.goal,
        current: getCurrentWeekTotal(g.pantry),
    }));
    res.json(pantries);
};

// Update pantry goal (admin)
exports.updateGoal = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pantry } = req.params;
    const { goal } = req.body;

    const stmt = db.prepare('UPDATE pantry_goals SET goal = ? WHERE pantry = ?');
    stmt.run(goal, pantry);

    res.json({ success: true });
};

// Record donation
exports.recordDonation = (req, res) => {
    const { pantry, amount, type, items } = req.body;

    const stmt = db.prepare(`
        INSERT INTO donations (pantry, amount, type, items)
        VALUES (?, ?, ?, ?)
    `);

    const itemsJson = items ? JSON.stringify(items) : null;
    stmt.run(pantry, amount, type, itemsJson);

    res.json({ success: true, current: getCurrentWeekTotal(pantry) });
};

// Get donation history
exports.getDonationHistory = (req, res) => {
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
};

// Clear donations (admin)
exports.clearDonations = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pantry } = req.params;

    if (pantry === 'all') {
        db.prepare('DELETE FROM donations').run();
    } else {
        db.prepare('DELETE FROM donations WHERE pantry = ?').run(pantry);
    }

    res.json({ success: true });
};
