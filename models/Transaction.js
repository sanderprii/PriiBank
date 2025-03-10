const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       required:
 *         - fromAccount
 *         - toAccount
 *         - amount
 *         - currency
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID
 *         fromAccount:
 *           type: string
 *           description: Sender account number
 *         toAccount:
 *           type: string
 *           description: Receiver account number
 *         amount:
 *           type: number
 *           description: Transaction amount
 *         currency:
 *           type: string
 *           enum: [EUR, USD, GBP]
 *           description: Transaction currency
 *         explanation:
 *           type: string
 *           description: Description of the transaction
 *         status:
 *           type: string
 *           enum: [pending, inProgress, completed, failed]
 *           description: Current status of the transaction
 *         senderName:
 *           type: string
 *           description: Name of the sender
 *         receiverName:
 *           type: string
 *           description: Name of the receiver
 *         type:
 *           type: string
 *           enum: [internal, external]
 *           description: Type of transaction (internal or external)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the transaction was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the transaction was last updated
 */
const TransactionSchema = new mongoose.Schema({
    fromAccount: {
        type: String,
        required: true
    },
    toAccount: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Amount must be greater than 0']
    },
    currency: {
        type: String,
        enum: ['EUR', 'USD', 'GBP'],
        required: true
    },
    explanation: {
        type: String,
        default: 'Transaction'
    },
    status: {
        type: String,
        enum: ['pending', 'inProgress', 'completed', 'failed'],
        default: 'pending'
    },
    senderName: {
        type: String,
        required: true
    },
    receiverName: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['internal', 'external'],
        required: true
    },
    statusMessage: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);