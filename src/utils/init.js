// src/utils/init.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { generateKeyPair } = require('./keyManagement');
const axios = require('axios');

const prisma = new PrismaClient();

/**
 * Kontrollib panga prefiksi formaati
 */
const validateBankPrefix = (prefix) => {
    return prefix && prefix.length === 3;
};

async function initializeBank() {
    try {
        console.log('Käivitan panga algsätete kontrollimise...');

        // Kontrolli, kas panga seaded on juba olemas
        let bankSettings = await prisma.bankSettings.findFirst();

        // Kui panga seaded puuduvad, loo need
        if (!bankSettings) {
            console.log('Panga seaded puuduvad, loon uued...');

            // Kontrolli, kas .env failis on määratud BANK_PREFIX
            const bankPrefix = process.env.BANK_PREFIX;
            if (bankPrefix && !validateBankPrefix(bankPrefix)) {
                console.warn('HOIATUS: .env failis määratud BANK_PREFIX ei ole õiges formaadis (peab olema täpselt 3 tähemärki)');
            }

            bankSettings = await prisma.bankSettings.create({
                data: {
                    bankName: process.env.BANK_NAME || 'MinuPank',
                    bankPrefix: validateBankPrefix(bankPrefix) ? bankPrefix : '',
                    jwksUrl: process.env.BANK_JWKS_URL || `http://localhost:${process.env.PORT || 3000}/transactions/jwks`,
                    transactionUrl: process.env.BANK_TRANSACTION_URL || `http://localhost:${process.env.PORT || 3000}/transactions/b2b`,
                    owners: process.env.BANK_OWNERS || 'Minu Pank AS',
                    registered: false
                }
            });
            console.log('Panga seaded loodud!');
        }

        // Kontrolli, kas võtmepaar on juba loodud
        const existingKey = await prisma.key.findFirst();

        if (!existingKey) {
            console.log('Võtmepaar puudub, genereerin uue...');
            await generateKeyPair();
            console.log('Võtmepaar loodud!');
        }

        // Kontrolli, kas pangal on juba prefiks
        if (!validateBankPrefix(bankSettings.bankPrefix)) {
            console.warn('HOIATUS: Pangal puudub veel korrektne prefiks. Prefiks on nõutud korrektsete kontonumbrite jaoks.');
            console.log('Palun registreeri pank keskpangas, et saada prefiks (npm run register-bank)');
        } else {
            console.log(`Panga prefiks: ${bankSettings.bankPrefix}`);
        }

        // Kui pank ei ole veel registreeritud ja on määratud registreerida
        if (!bankSettings.registered && process.env.AUTO_REGISTER === 'true') {
            console.log('Pank ei ole veel keskpangas registreeritud, algan registreerimisega...');

            try {
                // Saada registreerimise päring keskpangale
                const response = await axios.post(`${process.env.CENTRAL_BANK_URL}/banks`, {
                    name: bankSettings.bankName,
                    owners: bankSettings.owners,
                    jwksUrl: bankSettings.jwksUrl,
                    transactionUrl: bankSettings.transactionUrl
                });

                // Kontrolli, kas vastuses on prefiks ja see vastab nõuetele
                if (!validateBankPrefix(response.data.bankPrefix)) {
                    console.warn('HOIATUS: Keskpangalt saadud prefiks ei ole õiges formaadis! (peab olema täpselt 3 tähemärki)');
                }

                // Salvesta saadud andmed
                await prisma.bankSettings.update({
                    where: { id: bankSettings.id },
                    data: {
                        bankPrefix: response.data.bankPrefix,
                        apiKey: response.data.apiKey,
                        registered: true
                    }
                });

                console.log('Pank on edukalt keskpangas registreeritud!');
                console.log('Panga prefiks:', response.data.bankPrefix);
                console.log('API võti:', response.data.apiKey);
            } catch (error) {
                console.error('Panga registreerimine ebaõnnestus:', error.response?.data || error.message);
                console.log('Võimalik, et keskpank pole kättesaadav või andmed on vigased.');
                console.log('Kasuta käsitsi registreerimiseks: npm run register-bank');
            }
        }

        console.log('Panga algsätete kontroll on lõppenud!');
    } catch (error) {
        console.error('Panga algsätete kontroll ebaõnnestus:', error);
    }
}

// Käivita funktsioon ainult otse käivitatuna
if (require.main === module) {
    initializeBank()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Käivitusskripti viga:', error);
            process.exit(1);
        });
} else {
    // Ekspordi, et serverisse importida
    module.exports = { initializeBank };
}