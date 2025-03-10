// src/controllers/transactionController.js
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { generateSignedJWT, verifyJWTSignature } = require('../utils/jwt');
const { getBankPrefix } = require('../utils/accountUtils');

const prisma = new PrismaClient();

/**
 * Loo uus tehing
 */
const createTransaction = async (req, res) => {
    try {
        const { fromAccount, toAccount, amount, currency, explanation } = req.body;

        // Hangi saatja konto andmed
        const sourceAccount = await prisma.account.findUnique({
            where: { accountNumber: fromAccount },
            include: { user: true }
        });

        if (!sourceAccount) {
            return res.status(404).json({ error: 'Saatja kontot ei leitud' });
        }

        // Kontrolli, kas konto kuulub kasutajale
        if (sourceAccount.userId !== req.user.id) {
            return res.status(403).json({ error: 'Puuduvad õigused' });
        }

        // Kontrolli saldot
        if (sourceAccount.balance < amount) {
            return res.status(400).json({ error: 'Ebapiisav saldo' });
        }

        // Kontrolli valuutat
        if (sourceAccount.currency !== currency) {
            return res.status(400).json({ error: 'Valuuta ei ühti konto valuutaga' });
        }

        // Hangi panga prefiks
        const bankSettings = await prisma.bankSettings.findFirst();

        if (!bankSettings || !bankSettings.bankPrefix) {
            return res.status(500).json({ error: 'Pank ei ole õigesti konfigureeritud' });
        }

        // Kontrolli, kas tegemist on sisemise või välise tehinguga
        const targetBankPrefix = getBankPrefix(toAccount);

        if (targetBankPrefix === bankSettings.bankPrefix) {
            // Sisemise tehingu töötlemine
            await processInternalTransaction(
                sourceAccount,
                toAccount,
                amount,
                currency,
                explanation || 'Ülekanne',
                req,
                res
            );
        } else {
            // Välise tehingu töötlemine
            await processExternalTransaction(
                sourceAccount,
                toAccount,
                amount,
                currency,
                explanation || 'Ülekanne',
                req,
                res
            );
        }
    } catch (error) {
        console.error('Tehingu loomine ebaõnnestus:', error);
        res.status(500).json({ error: 'Tehingu loomine ebaõnnestus' });
    }
};

/**
 * Salvesta ja töötle sisemist tehingut
 */
const processInternalTransaction = async (
    sourceAccount,
    targetAccountNumber,
    amount,
    currency,
    explanation,
    req,
    res
) => {
    // Kasuta transaktsiooni andmebaasi muudatuste jaoks
    const result = await prisma.$transaction(async (prisma) => {
        // Otsi sihtmärk konto
        const targetAccount = await prisma.account.findUnique({
            where: { accountNumber: targetAccountNumber },
            include: { user: true }
        });

        if (!targetAccount) {
            throw new Error('Saaja kontot ei leitud');
        }

        // Kontrolli valuutat
        if (targetAccount.currency !== currency) {
            throw new Error('Saaja konto valuuta ei ühti tehingu valuutaga');
        }

        // Loo uus tehing
        const transaction = await prisma.transaction.create({
            data: {
                fromAccountId: sourceAccount.id,
                toAccountId: targetAccount.id,
                amount,
                currency,
                status: 'completed',
                explanation,
                senderName: sourceAccount.user.username,
                receiverName: targetAccount.user.username
            }
        });

        // Uuenda kontode saldot
        await prisma.account.update({
            where: { id: sourceAccount.id },
            data: { balance: sourceAccount.balance - amount }
        });

        await prisma.account.update({
            where: { id: targetAccount.id },
            data: { balance: targetAccount.balance + amount }
        });

        return {
            transaction,
            sourceAccount,
            targetAccount
        };
    });

    res.status(201).json({
        message: 'Tehing edukalt sooritatud',
        transaction: result.transaction
    });
};

/**
 * Salvesta ja töötle välist tehingut
 */
const processExternalTransaction = async (
    sourceAccount,
    targetAccountNumber,
    amount,
    currency,
    explanation,
    req,
    res
) => {
    try {
        // Loo esialgne "pending" staatusega tehing
        const transaction = await prisma.transaction.create({
            data: {
                fromAccountId: sourceAccount.id,
                externalToAccount: targetAccountNumber,
                amount,
                currency,
                status: 'pending',
                explanation,
                senderName: sourceAccount.user.username
            }
        });

        // Hangi keskpanga andmed, et leida sihtpanga info
        const centralBankUrl = process.env.CENTRAL_BANK_URL;
        const banksResponse = await axios.get(`${centralBankUrl}/banks`);
        const banks = banksResponse.data;

        // Leia sihtpank prefiksi järgi
        const targetBankPrefix = getBankPrefix(targetAccountNumber);
        const targetBank = banks.find(bank => bank.bankPrefix === targetBankPrefix);

        if (!targetBank) {
            // Märgi tehing nurjunuks
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'failed' }
            });

            return res.status(404).json({
                error: 'Sihtpanka ei leitud selle prefiksiga',
                transactionId: transaction.id
            });
        }

        // Uuenda tehingu olekut
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'inProgress' }
        });

        // Valmista ette tehingu andmed JWT jaoks
        const jwtPayload = {
            accountFrom: sourceAccount.accountNumber,
            accountTo: targetAccountNumber,
            currency,
            amount,
            explanation,
            senderName: sourceAccount.user.username
        };

        // Allkirjasta JWT
        const jwt = await generateSignedJWT(jwtPayload);

        // Saada tehing sihtpanka
        const targetBankResponse = await axios.post(
            targetBank.transactionUrl,
            { jwt },
            { headers: { 'Content-Type': 'application/json' } }
        );

        // Tehing õnnestus, uuenda andmeid
        await prisma.$transaction(async (prisma) => {
            // Uuenda tehingut
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'completed',
                    receiverName: targetBankResponse.data.receiverName || 'Tundmatu'
                }
            });

            // Uuenda konto saldot
            await prisma.account.update({
                where: { id: sourceAccount.id },
                data: { balance: sourceAccount.balance - amount }
            });
        });

        res.status(201).json({
            message: 'Väline tehing edukalt sooritatud',
            transaction: {
                ...transaction,
                status: 'completed',
                receiverName: targetBankResponse.data.receiverName || 'Tundmatu'
            }
        });
    } catch (error) {
        // Märgi tehing nurjunuks vea korral
        if (error.response) {
            console.error('Välise tehingu viga:', error.response.data);
        } else {
            console.error('Välise tehingu viga:', error.message);
        }

        if (transaction && transaction.id) {
            // Uuenda tehingu olekut
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'failed',
                    explanation: `${explanation} (Viga: ${error.response?.data?.error || error.message})`
                }
            });
        }

        res.status(500).json({ error: 'Välise tehingu töötlemine ebaõnnestus' });
    }
};

/**
 * Töötleb sissetulevat tehingut teisest pangast (B2B endpoint)
 */
const processIncomingTransaction = async (req, res) => {
    try {
        const { jwt } = req.body;

        if (!jwt) {
            return res.status(400).json({ error: 'JWT puudub' });
        }

        // Dekodeeri JWT päis ilma allkirja kontrollimata, et saada 'kid'
        const [headerBase64] = jwt.split('.');
        const header = JSON.parse(Buffer.from(headerBase64, 'base64').toString());

        // Hangi saatjapanga andmed keskpangast
        const centralBankUrl = process.env.CENTRAL_BANK_URL;
        const banksResponse = await axios.get(`${centralBankUrl}/banks`);
        const banks = banksResponse.data;

        // Dekodeeri JWT payload ilma allkirja kontrollimata
        const [, payloadBase64] = jwt.split('.');
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

        // Leia saatjapank prefiksi järgi
        const senderBankPrefix = getBankPrefix(payload.accountFrom);
        const senderBank = banks.find(bank => bank.bankPrefix === senderBankPrefix);

        if (!senderBank) {
            return res.status(404).json({ error: 'Saatjapanka ei leitud' });
        }

        // Hangi saatja panga JWKS
        const jwksResponse = await axios.get(senderBank.jwksUrl);
        const jwks = jwksResponse.data;

        // Leia võti 'kid' põhjal
        const publicKey = jwks.keys.find(key => key.kid === header.kid);

        if (!publicKey) {
            return res.status(400).json({ error: 'Võtit ei leitud saatja pangast' });
        }

        // Verifikatseeri JWT allkiri
        const verifiedPayload = await verifyJWTSignature(jwt, publicKey);

        // Kontrolli, kas sihtmärgiks olev konto kuulub meie panka
        const bankSettings = await prisma.bankSettings.findFirst();
        const receiverAccountPrefix = getBankPrefix(verifiedPayload.accountTo);

        if (receiverAccountPrefix !== bankSettings.bankPrefix) {
            return res.status(400).json({ error: 'Sihtmärkkonto ei kuulu sellele pangale' });
        }

        // Otsi sihtmärk konto
        const targetAccount = await prisma.account.findUnique({
            where: { accountNumber: verifiedPayload.accountTo },
            include: { user: true }
        });

        if (!targetAccount) {
            return res.status(404).json({ error: 'Saaja kontot ei leitud' });
        }

        // Loo tehing ja uuenda konto saldot
        await prisma.$transaction(async (prisma) => {
            // Salvesta tehing
            await prisma.transaction.create({
                data: {
                    toAccountId: targetAccount.id,
                    externalFromAccount: verifiedPayload.accountFrom,
                    amount: verifiedPayload.amount,
                    currency: verifiedPayload.currency,
                    status: 'completed',
                    explanation: verifiedPayload.explanation,
                    senderName: verifiedPayload.senderName,
                    receiverName: targetAccount.user.username
                }
            });

            // Uuenda konto saldot
            // TODO: valuuta konversioon, kui valuutad erinevad
            await prisma.account.update({
                where: { id: targetAccount.id },
                data: { balance: targetAccount.balance + verifiedPayload.amount }
            });
        });

        // Vasta tehingu õnnestumisega
        res.status(200).json({
            receiverName: targetAccount.user.username
        });
    } catch (error) {
        console.error('Sissetuleva tehingu töötlemine ebaõnnestus:', error);
        res.status(500).json({ error: 'Tehingu töötlemine ebaõnnestus' });
    }
};

/**
 * Hangi kasutaja tehingute ajalugu
 */
const getTransactionHistory = async (req, res) => {
    try {
        // Hangi kasutaja kontod
        const userAccounts = await prisma.account.findMany({
            where: { userId: req.user.id }
        });

        const accountIds = userAccounts.map(account => account.id);

        // Hangi kõik tehingud, kus kasutaja on saatja või saaja
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { fromAccountId: { in: accountIds } },
                    { toAccountId: { in: accountIds } }
                ]
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                fromAccount: true,
                toAccount: true
            }
        });

        res.status(200).json(transactions);
    } catch (error) {
        console.error('Tehingute ajaloo pärimine ebaõnnestus:', error);
        res.status(500).json({ error: 'Tehingute ajaloo pärimine ebaõnnestus' });
    }
};

module.exports = {
    createTransaction,
    getTransactionHistory,
    processIncomingTransaction
};