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

// Add food item goal management
exports.setFoodItemGoal = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pantry, category, amount, unit } = req.body;

    const stmt = db.prepare(`
        INSERT INTO food_item_goals (pantry, category, amount, unit)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(pantry, category) 
        DO UPDATE SET amount = ?, unit = ?
    `);

    stmt.run(pantry, category, amount, unit, amount, unit);
    res.json({ success: true });
};

exports.getFoodItemGoals = (req, res) => {
    const { pantry } = req.params;
    const goals = db.prepare('SELECT * FROM food_item_goals WHERE pantry = ?').all(pantry);

    // Get current week achievements
    const weekStart = getMonday();

    console.log('Getting food goals for pantry:', pantry);
    console.log('Week start:', weekStart);

    const achievements = db
        .prepare(
            `
        SELECT category, SUM(amount) as total 
        FROM food_item_achievements 
        WHERE pantry = ? AND week_start = ?
        GROUP BY category
    `
        )
        .all(pantry, weekStart);

    console.log('Achievements found:', achievements);

    const achievementMap = {};
    achievements.forEach((a) => {
        achievementMap[a.category] = a.total;
    });

    console.log('Achievement map:', achievementMap);

    const result = goals.map((g) => ({
        ...g,
        achieved: achievementMap[g.category] || 0,
    }));

    console.log('Final result:', result);

    res.json(result);
};

exports.deleteFoodItemGoal = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pantry, category } = req.params;
    db.prepare('DELETE FROM food_item_goals WHERE pantry = ? AND category = ?').run(
        pantry,
        category
    );
    res.json({ success: true });
};

exports.recordFoodItemAchievement = (req, res) => {
    const { pantry, category, amount } = req.body;
    const weekStart = getMonday();

    const stmt = db.prepare(`
        INSERT INTO food_item_achievements (pantry, category, amount, week_start)
        VALUES (?, ?, ?, ?)
    `);

    stmt.run(pantry, category, amount, weekStart);
    res.json({ success: true });
};

// Record food item contribution
exports.recordFoodItemContribution = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pantry, category, amount, contributorName } = req.body;
    const weekStart = getMonday();

    const stmt = db.prepare(`
        INSERT INTO food_item_achievements (pantry, category, amount, week_start, contributor_name, recorded_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(pantry, category, amount, weekStart, contributorName || 'Anonymous');
    res.json({ success: true });
};

// Mark food goal as complete
exports.markFoodGoalComplete = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pantry, category } = req.body;
    const weekStart = getMonday();

    // Get the goal amount
    const goal = db
        .prepare('SELECT amount FROM food_item_goals WHERE pantry = ? AND category = ?')
        .get(pantry, category);

    if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
    }

    // Get current achievement
    const current = db
        .prepare(
            `
        SELECT SUM(amount) as total 
        FROM food_item_achievements 
        WHERE pantry = ? AND category = ? AND week_start = ?
    `
        )
        .get(pantry, category, weekStart);

    const currentAmount = current?.total || 0;
    const remaining = goal.amount - currentAmount;

    if (remaining > 0) {
        // Add the remaining amount to mark as complete
        const stmt = db.prepare(`
            INSERT INTO food_item_achievements (pantry, category, amount, week_start, contributor_name, recorded_at)
            VALUES (?, ?, ?, ?, 'Admin Complete', datetime('now'))
        `);
        stmt.run(pantry, category, remaining, weekStart);
    }

    res.json({ success: true });
};

// Get food item contribution history
exports.getFoodItemHistory = (req, res) => {
    const { pantry } = req.params;
    const weekStart = getMonday();

    const history = db
        .prepare(
            `
        SELECT * FROM food_item_achievements 
        WHERE pantry = ? AND week_start = ?
        ORDER BY recorded_at DESC
    `
        )
        .all(pantry, weekStart);

    res.json(history);
};
