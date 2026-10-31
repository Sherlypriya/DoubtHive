const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

router.post('/reset-admin-password', async (req, res) => {
    try {
        const secret = req.headers['x-reset-secret'];

        if (!process.env.ADMIN_RESET_SECRET ||
            secret !== process.env.ADMIN_RESET_SECRET) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 12) {
            return res.status(400).json({
                message: 'Password must contain at least 12 characters'
            });
        }

        const admin = await User.findOne({
            email: 'admin@demo.com'
        });

        if (!admin) {
            return res.status(404).json({
                message: 'Admin account not found'
            });
        }

        admin.password = await bcrypt.hash(newPassword, 10);
        admin.role = 'admin';

        await admin.save();

        return res.json({
            message: 'Admin password reset successfully'
        });

    } catch (error) {
        console.error('Admin reset error:', error.message);

        return res.status(500).json({
            message: 'Password reset failed'
        });
    }
});

module.exports = router;