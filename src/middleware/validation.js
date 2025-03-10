// src/middleware/validation.js
/**
 * Registreerimise andmete valideerimise middleware
 */
const validateRegistration = (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Kasutajanimi ja parool on kohustuslikud' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Kasutajanimi peab olema vähemalt 3 tähemärki pikk' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Parool peab olema vähemalt 6 tähemärki pikk' });
    }

    next();
};

/**
 * Konto loomise andmete valideerimise middleware
 */
const validateAccount = (req, res, next) => {
    const { currency } = req.body;

    if (!currency) {
        return res.status(400).json({ error: 'Valuuta on kohustuslik' });
    }

    const supportedCurrencies = ['EUR', 'USD', 'GBP'];
    if (!supportedCurrencies.includes(currency)) {
        return res.status(400).json({
            error: `Toetatud valuutad: ${supportedCurrencies.join(', ')}`
        });
    }

    next();
};

/**
 * Tehingu andmete valideerimise middleware
 */
const validateTransaction = (req, res, next) => {
    const { fromAccount, toAccount, amount, currency, explanation } = req.body;

    if (!fromAccount || !toAccount || !amount || !currency) {
        return res.status(400).json({
            error: 'Saatja konto, saaja konto, summa ja valuuta on kohustuslikud'
        });
    }

    if (fromAccount === toAccount) {
        return res.status(400).json({ error: 'Saatja ja saaja konto ei saa olla samad' });
    }

    if (amount <= 0) {
        return res.status(400).json({ error: 'Summa peab olema suurem kui null' });
    }

    const supportedCurrencies = ['EUR', 'USD', 'GBP'];
    if (!supportedCurrencies.includes(currency)) {
        return res.status(400).json({
            error: `Toetatud valuutad: ${supportedCurrencies.join(', ')}`
        });
    }

    next();
};

module.exports = {
    validateRegistration,
    validateAccount,
    validateTransaction
};