// src/controllers/accountController.js
const { PrismaClient } = require('@prisma/client');
const { generateAccountNumber, validateAccountNumber } = require('../utils/accountUtils');

const prisma = new PrismaClient();

/**
 * Hangi kasutaja kõik kontod
 */
const getAccounts = async (req, res) => {
    try {
        const accounts = await prisma.account.findMany({
            where: { userId: req.user.id }
        });

        res.status(200).json(accounts);
    } catch (error) {
        console.error('Kontode pärimine ebaõnnestus:', error);
        res.status(500).json({ error: 'Kontode pärimine ebaõnnestus' });
    }
};

/**
 * Loo uus konto
 */
const createAccount = async (req, res) => {
    try {
        const { currency } = req.body;

        // Hangi panga prefiks
        const bankSettings = await prisma.bankSettings.findFirst();

        if (!bankSettings) {
            return res.status(500).json({
                error: 'Pank ei ole õigesti konfigureeritud. Panga seaded puuduvad.'
            });
        }

        if (!bankSettings.bankPrefix || bankSettings.bankPrefix.length !== 3) {
            return res.status(500).json({
                error: 'Pank ei ole õigesti konfigureeritud. Panga prefiks puudub või on vigane (peab olema täpselt 3 tähemärki).'
            });
        }

        // Genereeri kontonumber
        const accountNumber = await generateAccountNumber(bankSettings.bankPrefix);

        // Kontrolli kontonumbri formaati
        if (!validateAccountNumber(accountNumber)) {
            return res.status(500).json({
                error: 'Kontonumbri genereerimine ebaõnnestus. Kontonumber ei ole õiges formaadis.'
            });
        }

        // Kontrolli, kas kontonumber algab prefiksiga
        if (!accountNumber.startsWith(bankSettings.bankPrefix)) {
            return res.status(500).json({
                error: 'Kontonumbri genereerimine ebaõnnestus. Kontonumber ei alga panga prefiksiga.'
            });
        }

        console.log(`Loon uue konto prefiksiga ${bankSettings.bankPrefix}, täielik kontonumber: ${accountNumber}`);

        // Loo uus konto
        const newAccount = await prisma.account.create({
            data: {
                userId: req.user.id,
                accountNumber,
                balance: 1000, // Algsaldo näidiseks
                currency
            }
        });

        res.status(201).json(newAccount);
    } catch (error) {
        console.error('Konto loomine ebaõnnestus:', error);
        res.status(500).json({ error: `Konto loomine ebaõnnestus: ${error.message}` });
    }
};

/**
 * Hangi ühe konto andmed
 */
const getAccount = async (req, res) => {
    try {
        const { id } = req.params;

        const account = await prisma.account.findUnique({
            where: { id }
        });

        if (!account) {
            return res.status(404).json({ error: 'Kontot ei leitud' });
        }

        // Kontrolli, kas konto kuulub kasutajale
        if (account.userId !== req.user.id) {
            return res.status(403).json({ error: 'Puuduvad õigused' });
        }

        res.status(200).json(account);
    } catch (error) {
        console.error('Konto pärimine ebaõnnestus:', error);
        res.status(500).json({ error: 'Konto pärimine ebaõnnestus' });
    }
};

module.exports = {
    getAccounts,
    createAccount,
    getAccount
};