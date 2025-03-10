// src/utils/swagger.js
const swaggerJsDoc = require('swagger-jsdoc');

// Swagger definitsioon
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MinuPank API',
            version: '1.0.0',
            description: 'MinuPank API dokumentatsioon',
            contact: {
                name: 'MinuPank tugi',
                email: 'tugi@minupank.com',
            },
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Arendusserver',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = swaggerDocs;