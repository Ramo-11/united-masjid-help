// Verify admin password
exports.verifyAdmin = (req, res) => {
    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {
        req.session.adminAuthenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
};

// Check admin authentication
exports.checkAdmin = (req, res) => {
    res.json({ authenticated: req.session.adminAuthenticated === true });
};

// Admin logout
exports.logout = (req, res) => {
    req.session.adminAuthenticated = false;
    res.json({ success: true });
};
