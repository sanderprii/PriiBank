// src/utils/currencyExchange.js
// Siin hoiame valuutakursse lokaalselt fikseeritud väärtustega

const exchangeRates = {
    EUR: {
        USD: 1.08,
        GBP: 0.85,
        EUR: 1
    },
    USD: {
        EUR: 0.93,
        GBP: 0.79,
        USD: 1
    },
    GBP: {
        EUR: 1.18,
        USD: 1.27,
        GBP: 1
    }
};

/**
 * Konverteerib summa ühest valuutast teise
 * @param {number} amount - Konverteeritav summa
 * @param {string} fromCurrency - Lähtevaluuta (EUR, USD, GBP)
 * @param {string} toCurrency - Sihtvaluuta (EUR, USD, GBP)
 * @returns {number} - Konverteeritud summa
 */
const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) {
        return amount; // Sama valuuta puhul pole konversiooni vaja
    }

    // Kontrolli, kas mõlemad valuutad on toetatud
    if (!exchangeRates[fromCurrency] || !exchangeRates[fromCurrency][toCurrency]) {
        throw new Error(`Valuutakonversioon ${fromCurrency} -> ${toCurrency} ei ole toetatud`);
    }

    // Konverteeri summa
    const rate = exchangeRates[fromCurrency][toCurrency];
    const convertedAmount = amount * rate;

    // Ümarda 2 komakohani
    return Math.round(convertedAmount * 100) / 100;
};

/**
 * Tagastab kõik toetatud valuutakursid
 * @returns {Object} - Valuutakursside objekt
 */
const getAllExchangeRates = () => {
    return exchangeRates;
};

/**
 * Tagastab konkreetse valuutapaari kursi
 * @param {string} fromCurrency - Lähtevaluuta
 * @param {string} toCurrency - Sihtvaluuta
 * @returns {number} - Valuutakurss
 */
const getExchangeRate = (fromCurrency, toCurrency) => {
    if (!exchangeRates[fromCurrency] || !exchangeRates[fromCurrency][toCurrency]) {
        throw new Error(`Valuutakurss ${fromCurrency} -> ${toCurrency} ei ole saadaval`);
    }

    return exchangeRates[fromCurrency][toCurrency];
};

module.exports = {
    convertCurrency,
    getAllExchangeRates,
    getExchangeRate
};