// src/routes/accounts.js
const express = require('express');
const {
    getAccounts,
    createAccount,
    getAccount
} = require('../controllers/accountController');
const { authenticate } = require('../middleware/auth');
const { validateAccount } = require('../middleware/validation');

const router = express.Router();

// Kõik kontoga seotud päringud vajavad autentimist
router.use(authenticate);

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Hangi kasutaja kõik kontod
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kontode nimekiri
 *       401:
 *         description: Autentimata
 *       500:
 *         description: Serveri viga
 */
router.get('/', getAccounts);

/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Loo uus konto
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currency
 *             properties:
 *               currency:
 *                 type: string
 *                 enum: [EUR, USD, GBP]
 *     responses:
 *       201:
 *         description: Konto edukalt loodud
 *       400:
 *         description: Vigane päring
 *       401:
 *         description: Autentimata
 *       500:
 *         description: Serveri viga
 */
router.post('/', validateAccount, createAccount);

/**
 * @swagger
 * /api/accounts/{id}:
 *   get:
 *     summary: Hangi ühe konto andmed
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Konto andmed
 *       401:
 *         description: Autentimata
 *       403:
 *         description: Puuduvad õigused
 *       404:
 *         description: Kontot ei leitud
 *       500:
 *         description: Serveri viga
 */
router.get('/:id', getAccount);

module.exports = router;