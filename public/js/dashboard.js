// public/js/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    // Kontrolli, kas kasutaja on sisse logitud
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Põhimuutujad
    const alertContainer = document.getElementById('alertContainer');
    const logoutButton = document.getElementById('logoutButton');
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    const viewSections = document.querySelectorAll('.view-section');

    // Kasutaja info
    const userWelcome = document.getElementById('userWelcome');
    const userUsername = document.getElementById('userUsername');

    // Ülevaate elemendid
    const overviewAccounts = document.getElementById('overviewAccounts');
    const recentTransactions = document.getElementById('recentTransactions');

    // Kontode elemendid
    const accountsList = document.getElementById('accountsList');
    const newAccountBtn = document.getElementById('newAccountBtn');
    const newAccountModal = document.getElementById('newAccountModal');
    const newAccountForm = document.getElementById('newAccountForm');
    const closeModalButtons = document.querySelectorAll('.close-modal, .close-modal-btn');

    // Tehingute elemendid
    const transactionsList = document.getElementById('transactionsList');

    // Ülekande elemendid
    const transferForm = document.getElementById('transferForm');
    const fromAccountSelect = document.getElementById('fromAccount');
    const currencySelect = document.getElementById('currency');

    // Määra kasutaja info
    const username = localStorage.getItem('username');
    userWelcome.textContent = `Tere, ${username}!`;
    userUsername.textContent = username;

    // Logi välja
    logoutButton.addEventListener('click', async (e) => {
        e.preventDefault();

        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Kustuta kohalikud andmed
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('userId');
            localStorage.removeItem('expiresAt');

            // Suuna sisselogimislehele
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Väljalogimine ebaõnnestus:', error);
            window.location.href = 'login.html'; // Suuna sisselogimislehele igal juhul
        }
    });

    // Navigatsioon vaadete vahel
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const viewToShow = link.getAttribute('data-view');

            // Muuda aktiivne link
            menuLinks.forEach(item => item.classList.remove('active'));
            link.classList.add('active');

            // Kuva õige vaade
            viewSections.forEach(section => {
                section.style.display = 'none';
            });

            document.getElementById(`${viewToShow}View`).style.display = 'block';

            // Värskenda vaate sisu
            if (viewToShow === 'overview') {
                loadOverview();
            } else if (viewToShow === 'accounts') {
                loadAccounts();
            } else if (viewToShow === 'transactions') {
                loadTransactions();
            } else if (viewToShow === 'transfer') {
                updateTransferForm();
            }
        });
    });

    // Uue konto modaali juhtimine
    newAccountBtn.addEventListener('click', () => {
        newAccountModal.classList.add('active');
    });

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            newAccountModal.classList.remove('active');
        });
    });

    // Uue konto loomine
    newAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currency = document.getElementById('accountCurrency').value;

        try {
            const response = await fetch('/api/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currency })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Konto loomine ebaõnnestus');
            }

            // Sulge modaal
            newAccountModal.classList.remove('active');

            // Värskenda kontode loendit
            loadAccounts();
            loadOverview();
            updateTransferForm();

            showAlert(`Uus ${currency} konto on edukalt loodud!`, 'success');
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });

    // Ülekande tegemine
    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fromAccount = document.getElementById('fromAccount').value;
        const toAccount = document.getElementById('toAccount').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const currency = document.getElementById('currency').value;
        const explanation = document.getElementById('explanation').value || 'Ülekanne';

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fromAccount,
                    toAccount,
                    amount,
                    currency,
                    explanation
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ülekande tegemine ebaõnnestus');
            }

            // Tühjenda vorm
            transferForm.reset();

            // Värskenda andmeid
            loadOverview();
            loadAccounts();
            loadTransactions();

            // Näita vastust koos konversiooniinfoga, kui see on olemas
            let successMessage = 'Ülekanne edukalt teostatud!';
            if (data.conversionInfo) {
                successMessage += ` Konverteeritud: ${data.conversionInfo.originalAmount} ${data.conversionInfo.originalCurrency} -> ${data.conversionInfo.convertedAmount} ${data.conversionInfo.convertedCurrency}`;
            }

            showAlert(successMessage, 'success');
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });

    // Funktsioon kontode laadimiseks
    async function loadAccounts() {
        try {
            const response = await fetch('/api/accounts', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Kontode laadimine ebaõnnestus');
            }

            const accounts = await response.json();

            // Kuva kontod loetelus
            accountsList.innerHTML = '';

            if (accounts.length === 0) {
                accountsList.innerHTML = '<p>Sul pole veel kontosid. Loo uus konto, et alustada.</p>';
                return [];
            }

            accounts.forEach(account => {
                accountsList.innerHTML += `
                    <div class="account-card">
                        <div class="account-header">
                            <span class="account-currency">${account.currency}</span>
                            <span>${formatDate(account.createdAt)}</span>
                        </div>
                        <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
                        <div class="account-number">${account.accountNumber}</div>
                    </div>
                `;
            });

            return accounts;
        } catch (error) {
            showAlert(error.message, 'error');
            return [];
        }
    }

    // Funktsioon tehingute laadimiseks
    async function loadTransactions() {
        try {
            const response = await fetch('/api/transactions', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Tehingute laadimine ebaõnnestus');
            }

            const transactions = await response.json();

            // Kuva tehingud tabelis
            transactionsList.innerHTML = '';

            if (transactions.length === 0) {
                transactionsList.innerHTML = '<tr><td colspan="8" style="text-align: center;">Tehinguid pole veel tehtud.</td></tr>';
                return [];
            }

            transactions.forEach(transaction => {
                let fromAccount = transaction.fromAccount ? transaction.fromAccount.accountNumber : transaction.externalFromAccount || 'N/A';
                let toAccount = transaction.toAccount ? transaction.toAccount.accountNumber : transaction.externalToAccount || 'N/A';

                // Loo konversiooniinfo veerg
                let conversionInfo = '-';
                if (transaction.conversionRate) {
                    conversionInfo = `${formatCurrency(transaction.convertedAmount, transaction.convertedCurrency)} (${transaction.convertedCurrency})`;
                }

                transactionsList.innerHTML += `
                    <tr>
                        <td>${formatDate(transaction.createdAt)}</td>
                        <td>${transaction.senderName || 'N/A'} (${fromAccount})</td>
                        <td>${transaction.receiverName || 'N/A'} (${toAccount})</td>
                        <td>${formatCurrency(transaction.amount, transaction.currency)}</td>
                        <td>${transaction.currency}</td>
                        <td>${transaction.explanation || 'Ülekanne'}</td>
                        <td><span class="status-badge status-${transaction.status}">${translateStatus(transaction.status)}</span></td>
                        <td>${conversionInfo}</td>
                    </tr>
                `;
            });

            return transactions;
        } catch (error) {
            showAlert(error.message, 'error');
            return [];
        }
    }

    // Funktsioon ülevaate laadimiseks
    async function loadOverview() {
        // Lae kontod
        const accounts = await loadAccounts();

        // Kuva kontod ülevaates
        overviewAccounts.innerHTML = '';

        if (accounts.length === 0) {
            overviewAccounts.innerHTML = '<p>Sul pole veel kontosid. Mine "Kontod" vaatesse, et luua uus konto.</p>';
        } else {
            accounts.forEach(account => {
                overviewAccounts.innerHTML += `
                    <div class="account-card">
                        <div class="account-header">
                            <span class="account-currency">${account.currency}</span>
                            <span>${formatDate(account.createdAt)}</span>
                        </div>
                        <div class="account-balance">${formatCurrency(account.balance, account.currency)}</div>
                        <div class="account-number">${account.accountNumber}</div>
                    </div>
                `;
            });
        }

        // Lae viimatised tehingud
        try {
            const response = await fetch('/api/transactions', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Tehingute laadimine ebaõnnestus');
            }

            const transactions = await response.json();

            // Kuva viimatised 5 tehingut
            recentTransactions.innerHTML = '';

            if (transactions.length === 0) {
                recentTransactions.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tehinguid pole veel tehtud.</td></tr>';
                return;
            }

            const recentTx = transactions.slice(0, 5);

            recentTx.forEach(transaction => {
                // Määra, kas kasutaja on saatja või saaja
                const userId = localStorage.getItem('userId');
                const isOutgoing = transaction.fromAccount && transaction.fromAccount.userId === userId;

                // Vali kuvatavnimi vastavalt tehingu suunale
                const displayName = isOutgoing
                    ? transaction.receiverName || 'N/A'
                    : transaction.senderName || 'N/A';

                // Loo konversiooniinfo veerg
                let conversionInfo = '-';
                if (transaction.conversionRate) {
                    conversionInfo = `${formatCurrency(transaction.convertedAmount, transaction.convertedCurrency)} (${transaction.convertedCurrency})`;
                }

                recentTransactions.innerHTML += `
                    <tr>
                        <td>${formatDate(transaction.createdAt)}</td>
                        <td>${isOutgoing ? '-' : '+'}${formatCurrency(transaction.amount, transaction.currency)}</td>
                        <td>${transaction.currency}</td>
                        <td>${displayName}</td>
                        <td><span class="status-badge status-${transaction.status}">${translateStatus(transaction.status)}</span></td>
                        <td>${conversionInfo}</td>
                    </tr>
                `;
            });
        } catch (error) {
            showAlert(error.message, 'error');
        }
    }

    // Uuenda ülekande vormi kontode loendiga ja valuutakursiga
    async function updateTransferForm() {
        try {
            const response = await fetch('/api/accounts', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Kontode laadimine ebaõnnestus');
            }

            const accounts = await response.json();

            // Tühjenda olemasolevad valikud
            fromAccountSelect.innerHTML = '<option value="">Vali konto</option>';

            // Lisa kontod rippmenüüsse
            accounts.forEach(account => {
                fromAccountSelect.innerHTML += `
                    <option value="${account.accountNumber}" data-currency="${account.currency}">${account.accountNumber} (${account.currency}: ${formatCurrency(account.balance, account.currency)})</option>
                `;
            });

            // Lisa sündmuskuulajad valuutakursi näitamiseks
            const fromAccountElement = document.getElementById('fromAccount');
            const currencyElement = document.getElementById('currency');
            const toAccountElement = document.getElementById('toAccount');
            const exchangeRateContainer = document.getElementById('exchangeRateContainer') ||
                document.createElement('div');

            if (!document.getElementById('exchangeRateContainer')) {
                exchangeRateContainer.id = 'exchangeRateContainer';
                exchangeRateContainer.className = 'form-group';
                // Lisa konteiner ülekande vormi
                const amountGroup = document.querySelector('label[for="amount"]').parentNode;
                amountGroup.parentNode.insertBefore(exchangeRateContainer, amountGroup.nextSibling);
            }

            // Funktsioon valuutakursi näitamiseks
            async function showExchangeRate() {
                const fromOption = fromAccountElement.options[fromAccountElement.selectedIndex];
                if (!fromOption || !fromOption.value) return;

                const fromCurrency = fromOption.dataset.currency;
                const toCurrency = currencyElement.value;

                if (fromCurrency && toCurrency && fromCurrency !== toCurrency) {
                    try {
                        const response = await fetch(`/api/currency/rates/${fromCurrency}/${toCurrency}`);
                        const data = await response.json();

                        exchangeRateContainer.innerHTML = `
                            <div class="exchange-rate-info">
                                <p>Valuutakurss: 1 ${fromCurrency} = ${data.rate} ${toCurrency}</p>
                            </div>
                        `;
                    } catch (error) {
                        exchangeRateContainer.innerHTML = `
                            <div class="exchange-rate-info">
                                <p>Valuutakurssi ei õnnestunud laadida</p>
                            </div>
                        `;
                    }
                } else {
                    exchangeRateContainer.innerHTML = '';
                }
            }

            // Lisa sündmuskuulajad
            fromAccountElement.addEventListener('change', showExchangeRate);
            currencyElement.addEventListener('change', showExchangeRate);

            // Määra saatja konto valuuta vaikeväärtuseks, kui konto on valitud
            fromAccountElement.addEventListener('change', () => {
                const selectedOption = fromAccountElement.options[fromAccountElement.selectedIndex];
                if (selectedOption && selectedOption.dataset.currency) {
                    currencyElement.value = selectedOption.dataset.currency;
                }
                showExchangeRate();
            });
        } catch (error) {
            showAlert(error.message, 'error');
        }
    }

    // Abifunktsioonid
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('et-EE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatCurrency(amount, currency) {
        return amount.toLocaleString('et-EE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function translateStatus(status) {
        const translations = {
            'pending': 'Ootel',
            'inProgress': 'Töötlemisel',
            'completed': 'Tehtud',
            'failed': 'Ebaõnnestunud'
        };

        return translations[status] || status;
    }

    // Funktsioon teadete kuvamiseks
    function showAlert(message, type) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type}">
                ${message}
            </div>
        `;

        // Eemalda teade peale 5 sekundit
        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 5000);
    }

    // Lae algandmed
    loadOverview();
    updateTransferForm();
});