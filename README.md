# MinuPank - Banking Application

MinuPank is a simple and secure banking application that allows users to register, manage accounts, and make money transfers both within the bank and to other banks.

## Features

- User registration and login
- Multi-currency account management
- Internal transfers between accounts within the same bank
- External transfers to accounts in other banks
- Transaction history tracking
- JWT-based secure communication with other banks

## Installation

### Prerequisites

- Node.js (v14+)
- npm
- Internet connection for communication with the Central Bank

### Installation Guide

1. Clone the repository:
```
git clone https://github.com/sanderprii/priibank.git
cd priibank
```

2. Install dependencies:
```
npm install
```

3. Configure environment variables:
- Copy the `.env.example` file to `.env`
- Fill in the required values (server port, bank name, etc.)

4. Set up the database:
```
npx prisma migrate dev
```

5. Generate key pair:
```
npm run generate-keys
```

6. Register the bank with the Central Bank:
```
npm run register-bank
```

7. Start the application:
```
npm start
```

8. Open a web browser and visit:
```
http://localhost:3000
```

## Usage

### Registering a New User

1. Visit the homepage and click "Register" or directly open `/register.html`
2. Fill in the username and password
3. Click the "Register" button

### Logging In

1. Visit the homepage and click "Login" or directly open `/login.html`
2. Enter your username and password
3. Click the "Login" button

### Creating a New Account

1. After logging in, navigate to the "Accounts" view
2. Click the "New Account" button
3. Select the desired currency
4. Click the "Create Account" button

### Making a Transfer

1. Navigate to the "Transfers" view
2. Select the sender's account
3. Enter the recipient's account, amount, and description
4. Click the "Confirm Payment" button

## API Documentation

API documentation is available at the `/docs` endpoint. This includes all available API endpoints with their descriptions, parameters, and response formats.

## Central Bank

The application communicates with the Central Bank located at: https://henno.cfd/central-bank/

## For Developers

### Database Structure

The database is defined in the Prisma schema file (`prisma/schema.prisma`). The main models are:

- `User`: User data
- `Session`: User session data
- `Account`: Account data
- `Transaction`: Transaction data
- `Key`: RSA key pairs
- `BankSettings`: Bank configuration

### JWT Signing

RSA key pairs are used for secure signing of transactions. Each external transaction is signed with the bank's private key, and the receiving bank verifies it with the public key.

### Transaction Processing

Transactions are processed according to whether they are:
- Internal (within the same bank)
- Outgoing to external banks
- Incoming from external banks

Each transaction has one of these statuses:
- `pending`: Initiated but not yet processed
- `inProgress`: Being processed
- `completed`: Successfully completed
- `failed`: Failed

## Security

- All passwords are stored encrypted (using bcrypt)
- Transactions are signed using JWT
- External bank signatures are verified with their public keys

## Using Ngrok for External Access

Since the application runs locally, you'll need Ngrok or a similar service to allow the Central Bank and other banks to access your endpoints:

1. Install Ngrok: https://ngrok.com/download
2. Run your bank application: `npm start`
3. Run Ngrok to create a tunnel to your local server: `ngrok http 3000`
4. Update your `.env` file with the Ngrok URLs:
   ```
   BANK_JWKS_URL=https://your-ngrok-url.ngrok-free.app/transactions/jwks
   BANK_TRANSACTION_URL=https://your-ngrok-url.ngrok-free.app/transactions/b2b
   ```
5. Restart your application and register the bank again: `npm run register-bank`



