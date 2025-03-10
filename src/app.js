// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

// Impordi marsruudid
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const jwksRoutes = require('./routes/jwks');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Swagger definitsioon
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MinuPank API',
            version: '1.0.0',
            description: 'MinuPank API dokumentatsioon',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Arendusserver'
            },
        ],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Marsruudid
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/transactions', jwksRoutes);

// 404 käitleja
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
});

// Vea käitleja
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Midagi läks valesti!' });
});

module.exports = app;