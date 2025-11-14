const Database = require('better-sqlite3');
const dbPath = process.env.NODE_ENV === 'production' ? '/data/pantry.db' : 'pantry.db';
const db = new Database(dbPath);

// Get all volunteer slots
exports.getAllSlots = (req, res) => {
    // Add WHERE clause to exclude completed slots
    const slots = db
        .prepare(
            'SELECT * FROM volunteer_slots WHERE (completed IS NULL OR completed = 0) ORDER BY date ASC'
        )
        .all();

    const slotsWithCounts = slots.map((slot) => {
        const count = db
            .prepare('SELECT COUNT(*) as count FROM volunteers WHERE slot_id = ?')
            .get(slot.id).count;
        return { ...slot, signupCount: count, pantry: slot.pantry || null };
    });

    res.json(slotsWithCounts);
};

exports.getAllSlotsAdmin = (req, res) => {
    // Include ALL slots for admin view
    const slots = db.prepare('SELECT * FROM volunteer_slots ORDER BY date ASC').all();

    const slotsWithCounts = slots.map((slot) => {
        const count = db
            .prepare('SELECT COUNT(*) as count FROM volunteers WHERE slot_id = ?')
            .get(slot.id).count;
        return { ...slot, signupCount: count, pantry: slot.pantry || null };
    });

    res.json(slotsWithCounts);
};

// Add volunteer slot (admin)
exports.addSlot = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, date, time, location, address, type, maxVolunteers, pantry } = req.body;

    const stmt = db.prepare(`
        INSERT INTO volunteer_slots (id, date, time, location, address, type, max_volunteers, pantry)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, date, time, location, address || '', type, maxVolunteers, pantry || null);

    res.json({ success: true });
};

// Delete volunteer slot (admin)
exports.deleteSlot = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Delete volunteers for this slot
    db.prepare('DELETE FROM volunteers WHERE slot_id = ?').run(id);
    // Delete the slot
    db.prepare('DELETE FROM volunteer_slots WHERE id = ?').run(id);

    res.json({ success: true });
};

// Register volunteer
exports.registerVolunteer = (req, res) => {
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
};

// Get all volunteers (admin)
exports.getAllVolunteers = (req, res) => {
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
};

// Clear volunteers (admin)
exports.clearVolunteers = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { slotId } = req.params;

    if (slotId === 'all') {
        db.prepare('DELETE FROM volunteers').run();
    } else {
        db.prepare('DELETE FROM volunteers WHERE slot_id = ?').run(slotId);
    }

    res.json({ success: true });
};

// Update volunteer slot
exports.updateSlot = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { date, time, location, address, type, maxVolunteers, pantry } = req.body;

    const stmt = db.prepare(`
        UPDATE volunteer_slots 
        SET date = ?, time = ?, location = ?, address = ?, type = ?, max_volunteers = ?, pantry = ?
        WHERE id = ?
    `);

    stmt.run(date, time, location, address || '', type, maxVolunteers, pantry || null, id);
    res.json({ success: true });
};

// Mark slot as complete (archive it)
exports.markSlotComplete = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Check if column exists first
    try {
        const columns = db.prepare('PRAGMA table_info(volunteer_slots)').all();
        const hasCompletedColumn = columns.some((col) => col.name === 'completed');

        if (!hasCompletedColumn) {
            db.prepare('ALTER TABLE volunteer_slots ADD COLUMN completed BOOLEAN DEFAULT 0').run();
        }

        db.prepare('UPDATE volunteer_slots SET completed = 1 WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking slot complete:', error);
        res.status(500).json({ error: 'Failed to mark slot complete' });
    }
};
