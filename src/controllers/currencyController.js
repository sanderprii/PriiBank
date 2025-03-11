// src/controllers/currencyController.js
const { getAllExchangeRates, getExchangeRate } = require('../utils/currencyExchange');

/**
 * Hangi kõik valuutakursid
 */
const getExchangeRates = (req, res) => {
    try {
        const rates = getAllExchangeRates();
        res.status(200).json(rates);
    } catch (error) {
        console.error('Valuutakursside pärimine ebaõnnestus:', error);
        res.status(500).json({ error: 'Valuutakursside pärimine ebaõnnestus' });
    }
};

/**
 * Hangi konkreetne valuutakurss
 */
const getSpecificExchangeRate = (req, res) => {
    try {
        const { from, to } = req.params;

        if (!from || !to) {
            return res.status(400).json({ error: 'Lähte- ja sihtvaluuta on nõutud' });
        }

        const rate = getExchangeRate(from, to);
        res.status(200).json({ rate });
    } catch (error) {
        console.error('Valuutakursi pärimine ebaõnnestus:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getExchangeRates,
    getSpecificExchangeRate
};