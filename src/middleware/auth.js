// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Autentimise middleware, kontrollib JWT tokenit ja lisab kasutaja andmed päringule
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Autentimise token puudub' });
        }

        const token = authHeader.split(' ')[1];

        // Otsi sessioon andmebaasist
        const session = await prisma.session.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!session) {
            return res.status(401).json({ error: 'Vigane või aegunud sessioon' });
        }

        // Kontrolli, kas sessioon on aegunud
        if (new Date() > session.expiresAt) {
            await prisma.session.delete({ where: { id: session.id } });
            return res.status(401).json({ error: 'Sessioon on aegunud' });
        }

        // Lisa kasutaja info päringule
        req.user = session.user;
        req.sessionId = session.id;

        next();
    } catch (error) {
        console.error('Autentimise viga:', error);
        res.status(500).json({ error: 'Autentimise viga' });
    }
};

module.exports = { authenticate };
