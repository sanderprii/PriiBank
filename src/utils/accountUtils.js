// src/utils/accountUtils.js
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

/**
 * Genereeri unikaalne kontonumber
 *
 * Kontonumber peab vastama formaadile:
 * - Algab panga 3-tähelise prefiksiga
 * - Sellele järgneb unikaalne identifikaator
 * Näiteks: 843eaf7076184bdb8b74faea17d1c3c3287
 */
const generateAccountNumber = async (bankPrefix) => {
    if (!bankPrefix || bankPrefix.length !== 3) {
        throw new Error('Vigane panga prefiks - peab olema täpselt 3 tähemärki');
    }

    // Eemalda sidekriipsud UUID-st, et saada puhas string
    const uniqueId = uuidv4().replace(/-/g, '');

    // Loo kontonumber: prefiks + unikaalne ID
    const accountNumber = `${bankPrefix}${uniqueId}`;

    // Kontrolli veel kord, et kontonumber algaks prefiksiga
    if (!accountNumber.startsWith(bankPrefix)) {
        throw new Error('Genereeritud kontonumber ei alga panga prefiksiga');
    }

    return accountNumber;
};

/**
 * Kontrolli, kas panga prefiks on kehtiv
 */
const isBankPrefixValid = (accountNumber, bankPrefix) => {
    if (!accountNumber || !bankPrefix || bankPrefix.length !== 3) {
        return false;
    }
    return accountNumber.startsWith(bankPrefix);
};

/**
 * Hangi konto panga prefiks (esimesed 3 tähemärki)
 */
const getBankPrefix = (accountNumber) => {
    if (!accountNumber || accountNumber.length < 3) {
        throw new Error('Vigane kontonumber - peab olema vähemalt 3 tähemärki pikk');
    }
    return accountNumber.substring(0, 3);
};

/**
 * Kontrolli, kas kontonumber on õiges formaadis
 */
const validateAccountNumber = (accountNumber) => {
    // Kontonumber peab olema vähemalt 3+1 tähemärki pikk (prefiks + vähemalt 1 tähemärk)
    if (!accountNumber || accountNumber.length < 4) {
        return false;
    }

    // Kontonumber ei tohi sisaldada sidekriipse või tühikuid
    if (accountNumber.includes('-') || accountNumber.includes(' ')) {
        return false;
    }

    return true;
};

module.exports = {
    generateAccountNumber,
    isBankPrefixValid,
    getBankPrefix,
    validateAccountNumber
};