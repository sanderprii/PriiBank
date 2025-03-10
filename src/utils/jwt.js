// src/utils/jwt.js
const jose = require('node-jose');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Genereeri JWT allkirjastatud token
 */
const generateSignedJWT = async (payload) => {
    try {
        // Otsi aktiivne võti andmebaasist
        const activeKey = await prisma.key.findFirst({
            where: { active: true }
        });

        if (!activeKey) {
            throw new Error('Aktiivset võtit ei leitud');
        }

        // Paki privaatvõti JWK formaati
        const privateKey = JSON.parse(activeKey.privateKey);
        const key = await jose.JWK.asKey(privateKey);

        // Loo ja allkirjasta JWT
        const opt = { compact: true, jwk: key, fields: { typ: 'JWT', kid: activeKey.kid } };
        const token = await jose.JWS.createSign(opt, key)
            .update(JSON.stringify(payload))
            .final();

        return token;
    } catch (error) {
        console.error('JWT genereerimine ebaõnnestus:', error);
        throw error;
    }
};

/**
 * Verifikatseeri JWT allkiri
 */
const verifyJWTSignature = async (jwt, publicKeyJwk) => {
    try {
        const key = await jose.JWK.asKey(publicKeyJwk);
        const verifier = jose.JWS.createVerify(key);
        const result = await verifier.verify(jwt);

        const payload = JSON.parse(result.payload.toString());
        return payload;
    } catch (error) {
        console.error('JWT verifitseerimine ebaõnnestus:', error);
        throw error;
    }
};

module.exports = {
    generateSignedJWT,
    verifyJWTSignature
};