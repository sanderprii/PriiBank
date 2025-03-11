// src/controllers/transactionController.js
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { generateSignedJWT, verifyJWTSignature } = require('../utils/jwt');
const { getBankPrefix } = require('../utils/accountUtils');
const { convertCurrency } = require('../utils/currencyExchange');
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
    try {
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

            // Kontrolli valuutasid ja tee konversioon vajadusel
            let convertedAmount = amount;
            let conversionRate = 1;
            let convertedCurrency = targetAccount.currency;
            let sourceDeduction = amount;

            // Kontrolli, kas lähtevaluuta erineb saatja konto valuutast
            if (currency !== sourceAccount.currency) {
                // Konverteeri lähtevaluuta saatja konto valuutasse, et teada saada õige mahaarvamine
                sourceDeduction = convertCurrency(amount, currency, sourceAccount.currency);
                console.log(`Konverteerin tehingu lähtevaluuta ${amount} ${currency} -> ${sourceDeduction} ${sourceAccount.currency}`);
            }

            // Kontrolli, kas sihtvaluuta erineb saaja konto valuutast
            if (currency !== targetAccount.currency) {
                // Konverteeri lähtevaluuta saaja konto valuutasse
                convertedAmount = convertCurrency(amount, currency, targetAccount.currency);
                conversionRate = convertedAmount / amount;
                console.log(`Konverteerin tehingu sihtvaluuta ${amount} ${currency} -> ${convertedAmount} ${targetAccount.currency} (kurss: ${conversionRate})`);
            }

            // Kontrolli, kas saatjal on piisavalt raha
            if (sourceAccount.balance < sourceDeduction) {
                throw new Error(`Ebapiisav saldo. Sul on ${sourceAccount.balance} ${sourceAccount.currency}, aga vaja on ${sourceDeduction} ${sourceAccount.currency}`);
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
                    receiverName: targetAccount.user.username,
                    // Lisa konversiooni info, kui valuutad on erinevad
                    conversionRate: conversionRate !== 1 ? conversionRate : null,
                    convertedAmount: convertedAmount !== amount ? convertedAmount : null,
                    convertedCurrency: currency !== targetAccount.currency ? targetAccount.currency : null
                }
            });

            // Uuenda kontode saldot
            await prisma.account.update({
                where: { id: sourceAccount.id },
                data: { balance: sourceAccount.balance - sourceDeduction }
            });

            await prisma.account.update({
                where: { id: targetAccount.id },
                data: { balance: targetAccount.balance + convertedAmount }
            });

            return {
                transaction,
                sourceAccount,
                targetAccount,
                convertedAmount,
                conversionRate,
                sourceDeduction
            };
        });

        // Koosta vastus, mis sisaldab konversiooni infot
        const response = {
            message: 'Tehing edukalt sooritatud',
            transaction: result.transaction
        };

        // Lisa konversiooni info, kui see on olemas
        if (result.conversionRate !== 1) {
            response.conversionInfo = {
                originalAmount: amount,
                originalCurrency: currency,
                convertedAmount: result.convertedAmount,
                convertedCurrency: result.targetAccount.currency,
                conversionRate: result.conversionRate
            };
        }

        res.status(201).json(response);
    } catch (error) {
        console.error('Sisemise tehingu töötlemine ebaõnnestus:', error);
        res.status(500).json({ error: error.message });
    }
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
    let transaction = null; // Määrame transaction muutuja kohe alguses

    try {
        // Kontrolli valuutade vastavust ja tee vajadusel konversioon
        let sourceDeduction = amount;

        // Kui tehingu valuuta erineb saatja konto valuutast, konverteerime
        if (currency !== sourceAccount.currency) {
            sourceDeduction = convertCurrency(amount, currency, sourceAccount.currency);
            console.log(`Konverteerin tehingu lähtevaluuta: ${amount} ${currency} -> ${sourceDeduction} ${sourceAccount.currency}`);

            // Kontrolli, kas saatjal on piisavalt raha
            if (sourceAccount.balance < sourceDeduction) {
                return res.status(400).json({
                    error: `Ebapiisav saldo. Sul on ${sourceAccount.balance} ${sourceAccount.currency}, aga vaja on ${sourceDeduction} ${sourceAccount.currency}`
                });
            }
        } else {
            // Kontrolli, kas saatjal on piisavalt raha
            if (sourceAccount.balance < amount) {
                return res.status(400).json({ error: 'Ebapiisav saldo' });
            }
        }

        // Loo esialgne "pending" staatusega tehing
        transaction = await prisma.transaction.create({
            data: {
                fromAccountId: sourceAccount.id,
                externalToAccount: targetAccountNumber,
                amount,
                currency,
                status: 'pending',
                explanation,
                senderName: sourceAccount.user.username,
                // Lisa konversiooni info, kui valuutad on erinevad
                conversionRate: currency !== sourceAccount.currency ? sourceDeduction / amount : null,
                convertedAmount: currency !== sourceAccount.currency ? sourceDeduction : null,
                convertedCurrency: currency !== sourceAccount.currency ? sourceAccount.currency : null
            }
        });

        console.log(`Välise tehingu ID ${transaction.id} loodud staatusega "pending"`);

        // Hangi keskpanga andmed, et leida sihtpanga info
        const centralBankUrl = process.env.CENTRAL_BANK_URL;
        console.log(`Küsin keskpanga infot ${centralBankUrl}/banks`);

        const banksResponse = await axios.get(`${centralBankUrl}/banks`);
        const banks = banksResponse.data;

        // Leia sihtpank prefiksi järgi
        const targetBankPrefix = getBankPrefix(targetAccountNumber);
        console.log(`Otsin sihtpanka prefiksiga ${targetBankPrefix}`);

        const targetBank = banks.find(bank => bank.bankPrefix === targetBankPrefix);

        if (!targetBank) {
            // Märgi tehing nurjunuks
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'failed' }
            });

            console.log(`Sihtpanka prefiksiga ${targetBankPrefix} ei leitud. Tehing märgitud nurjunuks.`);

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

        console.log(`Tehingu olek muudetud "inProgress". Sihtpanga andmed:`, targetBank);

        // Valmista ette tehingu andmed JWT jaoks
        // Saadame originaalvaluutas, laskme sihtpangal teha konversiooni
        const jwtPayload = {
            accountFrom: sourceAccount.accountNumber,
            accountTo: targetAccountNumber,
            currency,
            amount,
            explanation,
            senderName: sourceAccount.user.username
        };

        // Allkirjasta JWT
        console.log(`Allkirjastan JWT tehingu andmetega`);
        const jwt = await generateSignedJWT(jwtPayload);

        // Saada tehing sihtpanka
        console.log(`Saadan tehingu sihtpanka: ${targetBank.transactionUrl}`);

        try {
            const targetBankResponse = await axios.post(
                targetBank.transactionUrl,
                { jwt },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000 // lisame 10-sekundilise timeout'i
                }
            );

            console.log(`Saadi vastus sihtpangast:`, targetBankResponse.data);

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
                    data: { balance: sourceAccount.balance - sourceDeduction }
                });
            });

            console.log(`Tehing ID ${transaction.id} edukalt lõpetatud`);

            res.status(201).json({
                message: 'Väline tehing edukalt sooritatud',
                transaction: {
                    ...transaction,
                    status: 'completed',
                    receiverName: targetBankResponse.data.receiverName || 'Tundmatu'
                }
            });
        } catch (requestError) {
            console.error(`Viga tehingu saatmisel sihtpanka:`, requestError.message);

            if (requestError.response) {
                console.error(`Sihtpanga vastus:`, requestError.response.data);
            }

            // Märgi tehing nurjunuks
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'failed',
                    explanation: `${explanation} (Viga: ${requestError.response?.data?.error || requestError.message})`
                }
            });

            return res.status(500).json({
                error: 'Tehingu saatmine sihtpanka ebaõnnestus',
                details: requestError.response?.data?.error || requestError.message,
                transactionId: transaction.id
            });
        }
    } catch (error) {
        // Siin käsitleme peamist viga
        console.error('Välise tehingu üldine viga:', error.message);

        if (error.response) {
            console.error('Välise tehingu vastus:', error.response.data);
        }

        // Kui tehing on juba loodud, uuendame selle staatust
        if (transaction && transaction.id) {
            try {
                // Uuenda tehingu olekut
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'failed',
                        explanation: `${explanation} (Viga: ${error.response?.data?.error || error.message})`
                    }
                });
                console.log(`Tehing ID ${transaction.id} märgitud nurjunuks`);
            } catch (updateError) {
                console.error('Tehingu oleku uuendamine ebaõnnestus:', updateError);
            }
        }

        res.status(500).json({
            error: 'Välise tehingu töötlemine ebaõnnestus',
            details: error.message
        });
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

        // Kontrolli valuutakonversiooni vajadust
        let convertedAmount = verifiedPayload.amount;
        let conversionRate = 1;
        let convertedCurrency = targetAccount.currency;

        // Kui sissetulev tehing on teises valuutas kui saaja konto
        if (verifiedPayload.currency !== targetAccount.currency) {
            try {
                // Konverteeri summa saaja konto valuutasse
                convertedAmount = convertCurrency(
                    verifiedPayload.amount,
                    verifiedPayload.currency,
                    targetAccount.currency
                );
                conversionRate = convertedAmount / verifiedPayload.amount;

                console.log(`Konverteerin sissetuleva tehingu summa: ${verifiedPayload.amount} ${verifiedPayload.currency} -> ${convertedAmount} ${targetAccount.currency} (kurss: ${conversionRate})`);
            } catch (conversionError) {
                console.error('Valuutakonversioon ebaõnnestus:', conversionError);
                return res.status(400).json({
                    error: `Valuutakonversioon ${verifiedPayload.currency} -> ${targetAccount.currency} ebaõnnestus: ${conversionError.message}`
                });
            }
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
                    receiverName: targetAccount.user.username,
                    // Lisa konversiooni info, kui valuutad on erinevad
                    conversionRate: conversionRate !== 1 ? conversionRate : null,
                    convertedAmount: convertedAmount !== verifiedPayload.amount ? convertedAmount : null,
                    convertedCurrency: verifiedPayload.currency !== targetAccount.currency ? targetAccount.currency : null
                }
            });

            // Uuenda konto saldot konverteeritud summaga
            await prisma.account.update({
                where: { id: targetAccount.id },
                data: { balance: targetAccount.balance + convertedAmount }
            });
        });

        // Vasta tehingu õnnestumisega
        res.status(200).json({
            receiverName: targetAccount.user.username
        });
    } catch (error) {
        console.error('Sissetuleva tehingu töötlemine ebaõnnestus:', error);
        res.status(500).json({ error: 'Tehingu töötlemine ebaõnnestus: ' + error.message });
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