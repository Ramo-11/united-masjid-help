const Database = require('better-sqlite3');
const dbPath = process.env.NODE_ENV === 'production' ? '/data/pantry.db' : 'pantry.db';
const db = new Database(dbPath);

function getMonday(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

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

// Get pantry addresses
exports.getPantryAddresses = (req, res) => {
    const addresses = {
        almumineen: {
            name: 'Al-Mumineen',
            address: '4088 Millersville Rd, Indianapolis, IN 46205',
            hours: 'Open from Fajr to Isha',
            notes: 'If no one is available, items can be left in the multipurpose room',
        },
        alfajr: {
            name: 'Al-Fajr',
            address: '2846 Cold Spring Rd, Indianapolis, IN 46222',
            hours: 'Please coordinate with pantry coordinator',
            notes: '',
        },
        alhuda: {
            name: 'Al-Huda',
            address: '12213 Lantern Rd, Fishers, IN 46038',
            hours: 'Please coordinate with pantry coordinator',
            notes: '',
        },
        gcc: {
            name: 'Geist Community Center',
            address: '14500 E 96th St, McCordsville, IN 46055',
            hours: 'Please coordinate with pantry coordinator',
            notes: '',
        },
        alsalam: {
            name: 'Al-Salam',
            address: '9551 Valparaiso Ct, Indianapolis, IN 46268',
            hours: 'Please coordinate with pantry coordinator',
            notes: '',
        },
    };
    res.json(addresses);
};

// Register item donation volunteer
exports.registerItemDonationVolunteer = (req, res) => {
    const { pantry, name, email, phone, items, date, time, notes } = req.body;

    const stmt = db.prepare(`
        INSERT INTO item_donation_volunteers (pantry, volunteer_name, volunteer_email, volunteer_phone, items, date, time, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(pantry, name, email, phone, JSON.stringify(items), date, time, notes || '');

    res.json({ success: true });
};

// Get item donation volunteers (admin)
exports.getItemDonationVolunteers = (req, res) => {
    const volunteers = db
        .prepare(
            `
        SELECT * FROM item_donation_volunteers 
        ORDER BY date DESC, time DESC
    `
        )
        .all();

    volunteers.forEach((v) => {
        v.items = JSON.parse(v.items);
    });

    res.json(volunteers);
};

// Mark item donation as complete (admin)
exports.markItemDonationComplete = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const donation = db.prepare('SELECT * FROM item_donation_volunteers WHERE id = ?').get(id);
    if (!donation) return res.status(404).json({ error: 'Donation not found' });

    const items = JSON.parse(donation.items);

    // Use CURRENT week, not donation date week
    const weekStart = getMonday(new Date()); // <-- Changed this line

    console.log('Marking donation complete:', {
        pantry: donation.pantry,
        items: items,
        weekStart: weekStart,
        currentDate: new Date().toISOString(),
    });

    const insert = db.prepare(`
        INSERT INTO food_item_achievements (pantry, category, amount, week_start)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(pantry, category, week_start) DO UPDATE SET amount = amount + excluded.amount
    `);

    const txn = db.transaction(() => {
        items.forEach((item) => {
            console.log('Adding achievement:', item.category, item.amount, 'for week:', weekStart);
            insert.run(donation.pantry, item.category, item.amount, weekStart);
        });

        db.prepare('UPDATE item_donation_volunteers SET status = ? WHERE id = ?').run(
            'completed',
            id
        );
    });

    txn();

    res.json({ success: true });
};
