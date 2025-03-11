// src/routes/currency.js
const express = require('express');
const {
    getExchangeRates,
    getSpecificExchangeRate
} = require('../controllers/currencyController');

const router = express.Router();

/**
 * @swagger
 * /api/currency/rates:
 *   get:
 *     summary: Hangi kõik valuutakursid
 *     tags: [Currency]
 *     responses:
 *       200:
 *         description: Valuutakursside nimekiri
 *       500:
 *         description: Serveri viga
 */
router.get('/rates', getExchangeRates);

/**
 * @swagger
 * /api/currency/rates/{from}/{to}:
 *   get:
 *     summary: Hangi konkreetne valuutakurss
 *     tags: [Currency]
 *     parameters:
 *       - in: path
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         description: Lähtevaluuta (nt EUR)
 *       - in: path
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         description: Sihtvaluuta (nt USD)
 *     responses:
 *       200:
 *         description: Valuutakurss
 *       400:
 *         description: Vigane päring
 *       500:
 *         description: Serveri viga
 */
router.get('/rates/:from/:to', getSpecificExchangeRate);

module.exports = router;