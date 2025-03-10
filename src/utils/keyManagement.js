// src/utils/keyManagement.js
const jose = require('node-jose');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

/**
 * Genereeri uus RSA võtmepaar
 */
const generateKeyPair = async () => {
    try {
        // Genereeri RSA võtmepaar
        const keystore = jose.JWK.createKeyStore();
        const key = await keystore.generate('RSA', 2048, {
            alg: 'RS256',
            use: 'sig'
        });

        // Salvesta privaatne ja avalik võti
        const keyId = key.kid;
        const privateKey = key.toJSON(true);
        const publicKey = key.toJSON();

        // Salvesta võtmed andmebaasi
        await prisma.key.create({
            data: {
                kid: keyId,
                privateKey: JSON.stringify(privateKey),
                publicKey: JSON.stringify(publicKey),
                active: true
            }
        });

        console.log('Võtmepaar genereeritud ja salvestatud, ID:', keyId);
        return { publicKey, privateKey, kid: keyId };
    } catch (error) {
        console.error('Võtmepaari genereerimine ebaõnnestus:', error);
        throw error;
    }
};

/**
 * Hangi kõik avalikud võtmed JWKS formaadis
 */
const getJWKS = async () => {
    try {
        const keys = await prisma.key.findMany();
        const jwks = {
            keys: keys.map(key => JSON.parse(key.publicKey))
        };

        return jwks;
    } catch (error) {
        console.error('JWKS loomine ebaõnnestus:', error);
        throw error;
    }
};

module.exports = {
    generateKeyPair,
    getJWKS
};
