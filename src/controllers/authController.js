// src/controllers/authController.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Kasutaja registreerimine
 */
const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Kontrolli, kas kasutajanimi on juba kasutusel
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Kasutajanimi on juba kasutusel' });
        }

        // Krüpteeri parool
        const hashedPassword = await bcrypt.hash(password, 10);

        // Loo uus kasutaja
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword
            }
        });

        res.status(201).json({
            message: 'Kasutaja registreeritud edukalt',
            userId: newUser.id
        });
    } catch (error) {
        console.error('Registreerimine ebaõnnestus:', error);
        res.status(500).json({ error: 'Registreerimine ebaõnnestus' });
    }
};

/**
 * Kasutaja sisselogimine
 */
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Otsi kasutaja andmebaasist
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return res.status(401).json({ error: 'Vale kasutajanimi või parool' });
        }

        // Kontrolli parooli
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Vale kasutajanimi või parool' });
        }

        // Loo ja salvesta sessioon
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await prisma.session.create({
            data: {
                userId: user.id,
                token,
                expiresAt
            }
        });

        // Saada token
        res.status(200).json({
            token,
            expiresAt,
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Sisselogimine ebaõnnestus:', error);
        res.status(500).json({ error: 'Sisselogimine ebaõnnestus' });
    }
};

/**
 * Kasutaja väljalogimine
 */
const logout = async (req, res) => {
    try {
        // Kustuta sessioon andmebaasist
        await prisma.session.delete({
            where: { id: req.sessionId }
        });

        res.status(200).json({ message: 'Väljalogimine õnnestus' });
    } catch (error) {
        console.error('Väljalogimine ebaõnnestus:', error);
        res.status(500).json({ error: 'Väljalogimine ebaõnnestus' });
    }
};

module.exports = {
    register,
    login,
    logout
};