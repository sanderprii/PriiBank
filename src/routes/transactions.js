// src/routes/transactions.js
const express = require('express');
const {
    createTransaction,
    getTransactionHistory
} = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');
const { validateTransaction } = require('../middleware/validation');

const router = express.Router();

// Kõik tehingutega seotud päringud vajavad autentimist
router.use(authenticate);

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Loo uus tehing
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccount
 *               - toAccount
 *               - amount
 *               - currency
 *             properties:
 *               fromAccount:
 *                 type: string
 *               toAccount:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 enum: [EUR, USD, GBP]
 *               explanation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tehing edukalt loodud
 *       400:
 *         description: Vigane päring
 *       401:
 *         description: Autentimata
 *       403:
 *         description: Puuduvad õigused
 *       404:
 *         description: Kontot ei leitud
 *       500:
 *         description: Serveri viga
 */
router.post('/', validateTransaction, createTransaction);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Hangi kasutaja tehingute ajalugu
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tehingute nimekiri
 *       401:
 *         description: Autentimata
 *       500:
 *         description: Serveri viga
 */
router.get('/', getTransactionHistory);

module.exports = router;