// src/utils/registerBank.js
require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// See skript registreerib panga keskpangas
const registerBank = async () => {
    try {
        console.log('Kontrollin panga registreerimise staatust...');

        // Kontrolli, kas pank on juba registreeritud
        let bankSettings = await prisma.bankSettings.findFirst();

        if (bankSettings && bankSettings.registered) {
            console.log('Pank on juba registreeritud!');
            console.log('Panga prefiks:', bankSettings.bankPrefix);
            console.log('API võti:', bankSettings.apiKey);
            process.exit(0);
        }

        // Loo panga seaded, kui need puuduvad
        if (!bankSettings) {
            console.log('Panga seaded puuduvad, loon uued...');
            bankSettings = await prisma.bankSettings.create({
                data: {
                    bankName: process.env.BANK_NAME,
                    bankPrefix: '',
                    jwksUrl: process.env.BANK_JWKS_URL,
                    transactionUrl: process.env.BANK_TRANSACTION_URL,
                    owners: process.env.BANK_OWNERS,
                    registered: false
                }
            });
        }

        console.log('Registreerin panga keskpangas...');
        console.log('Panga andmed:');
        console.log('- Nimi:', bankSettings.bankName);
        console.log('- Omanikud:', bankSettings.owners);
        console.log('- JWKS URL:', bankSettings.jwksUrl);
        console.log('- Transaction URL:', bankSettings.transactionUrl);

        // Saada registreerimise päring keskpangale
        const registrationData = {
            name: bankSettings.bankName,
            owners: bankSettings.owners,
            jwksUrl: bankSettings.jwksUrl,
            transactionUrl: bankSettings.transactionUrl
        };

        console.log('Saadan registreerimise päringu keskpangale:', process.env.CENTRAL_BANK_URL + '/banks');
        console.log('Andmed:', JSON.stringify(registrationData, null, 2));

        try {
            const response = await axios.post(process.env.CENTRAL_BANK_URL + '/banks', registrationData);

            // Salvesta saadud andmed
            await prisma.bankSettings.update({
                where: { id: bankSettings.id },
                data: {
                    bankPrefix: response.data.bankPrefix,
                    apiKey: response.data.apiKey,
                    registered: true
                }
            });

            console.log('Pank edukalt registreeritud!');
            console.log('Panga prefiks:', response.data.bankPrefix);
            console.log('API võti:', response.data.apiKey);
            process.exit(0);
        } catch (reqError) {
            console.error('Päringu viga:');
            console.error('Status:', reqError.response?.status);
            console.error('Vastuse andmed:', reqError.response?.data);
            console.error('Täielik error objekt:', reqError);
            throw reqError;
        }
    } catch (error) {
        console.error('Panga registreerimine ebaõnnestus:', error.message);
        process.exit(1);
    }
};

// Käivita skript ainult otse käivitatuna
if (require.main === module) {
    registerBank();
}