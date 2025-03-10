// src/routes/jwks.js
const express = require('express');
const { getJwks } = require('../controllers/jwksController');
const { processIncomingTransaction } = require('../controllers/transactionController');

const router = express.Router();

/**
 * @swagger
 * /transactions/jwks:
 *   get:
 *     summary: Hangi panga avalikud võtmed JWKS formaadis
 *     tags: [JWKS]
 *     responses:
 *       200:
 *         description: JWKS edukalt tagastatud
 *       500:
 *         description: Serveri viga
 */
router.get('/jwks', getJwks);

/**
 * @swagger
 * /transactions/b2b:
 *   post:
 *     summary: Töötle sissetulevat tehingut teisest pangast
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jwt
 *             properties:
 *               jwt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tehing edukalt töödeldud
 *       400:
 *         description: Vigane päring
 *       404:
 *         description: Kontot ei leitud
 *       500:
 *         description: Serveri viga
 */
router.post('/b2b', processIncomingTransaction);

module.exports = router;