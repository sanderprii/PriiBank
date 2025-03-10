// src/controllers/jwksController.js
const { getJWKS } = require('../utils/keyManagement');

/**
 * JWKS lõpp-punkt avalike võtmete jaoks
 */
const getJwks = async (req, res) => {
    try {
        const jwks = await getJWKS();
        res.status(200).json(jwks);
    } catch (error) {
        console.error('JWKS pärimine ebaõnnestus:', error);
        res.status(500).json({ error: 'JWKS pärimine ebaõnnestus' });
    }
};

module.exports = {
    getJwks
};