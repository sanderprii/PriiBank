// src/server.js
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Panga rakendus käivitatud aadressil http://localhost:${PORT}`);
});