
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

router.post('/reset-admin-password', async (req, res) => {
  try {
    const secret = req.headers['x-reset-secret'];

    if (
      !process.env.ADMIN_RESET_SECRET ||
      secret !== process.env.ADMIN_RESET_SECRET
    ) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({
        message: 'Password must contain at least 12 characters'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let admin = await User.findOne({ email: 'admin@demo.com' });

    if (!admin) {
      admin = new User({
        name: 'Admin User',
        email: 'admin@demo.com',
        password: hashedPassword,
        role: 'admin',
        department: 'Administration',
        reputation: 0,
        badges: []
      });

      await admin.save();

      return res.status(201).json({
        message: 'Admin account created successfully'
      });
    }

    admin.password = hashedPassword;
    admin.role = 'admin';
    await admin.save();

    return res.json({
      message: 'Admin password updated successfully'
    });

  } catch (error) {
    console.error('Admin setup error:', error.message);

    return res.status(500).json({
      message: 'Admin setup failed'
    });
  }
});

module.exports = router;
