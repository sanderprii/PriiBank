// src/utils/generateKeys.js
require('dotenv').config();
const { generateKeyPair } = require('./keyManagement');

// See skript genereerib ja salvestab võtmeid
const initializeKeys = async () => {
    try {
        console.log('Genereerime pangale uut võtmepaari...');
        await generateKeyPair();
        console.log('Võtmepaar on edukalt genereeritud!');
        process.exit(0);
    } catch (error) {
        console.error('Võtmete genereerimine ebaõnnestus:', error);
        process.exit(1);
    }
};

// Käivita skript ainult otse käivitatuna
if (require.main === module) {
    initializeKeys();
}