// src/routes/users.js
const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Kõik kasutajatega seotud päringud vajavad autentimist
router.use(authenticate);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Hangi sisseloginud kasutaja andmed
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kasutaja andmed
 *       401:
 *         description: Autentimata
 *       500:
 *         description: Serveri viga
 */
router.get('/me', (req, res) => {
    // Kasutaja andmed on juba päringule lisatud autentimise middleware poolt
    const { password, ...userWithoutPassword } = req.user;
    res.status(200).json(userWithoutPassword);
});

module.exports = router;