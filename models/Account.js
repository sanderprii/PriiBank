const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       required:
 *         - user
 *         - accountNumber
 *         - currency
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID
 *         user:
 *           type: string
 *           description: Reference to the user who owns this account
 *         accountNumber:
 *           type: string
 *           description: Unique account number starting with bank prefix
 *         currency:
 *           type: string
 *           enum: [EUR, USD, GBP]
 *           description: Account currency
 *         balance:
 *           type: number
 *           description: Current account balance
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the account was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the account was last updated
 */
const AccountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    accountNumber: {
        type: String,
        required: true,
        unique: true
    },
    currency: {
        type: String,
        enum: ['EUR', 'USD', 'GBP'],
        required: true
    },
    balance: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Generate unique account number before saving
AccountSchema.pre('save', function(next) {
    if (this.isNew) {
        // Generate a random suffix (excluding the bank prefix)
        const randomSuffix = crypto.randomBytes(16).toString('hex');

        // Combine bank prefix with random suffix
        this.accountNumber = `${process.env.BANK_PREFIX}${randomSuffix}`;
    }
    next();
});

module.exports = mongoose.model('Account', AccountSchema);