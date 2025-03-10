// src/routes/auth.js
const express = require('express');
const { register, login, logout } = require('../controllers/authController');
const { validateRegistration } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registreeri uus kasutaja
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kasutaja edukalt registreeritud
 *       400:
 *         description: Vigane päring
 *       500:
 *         description: Serveri viga
 */
router.post('/register', validateRegistration, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Logi sisse olemasoleva kasutajana
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Edukas sisselogimine
 *       401:
 *         description: Vale kasutajanimi või parool
 *       500:
 *         description: Serveri viga
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logi välja
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Edukas väljalogimine
 *       401:
 *         description: Autentimata
 *       500:
 *         description: Serveri viga
 */
router.post('/logout', authenticate, logout);

module.exports = router;