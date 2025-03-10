document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const alertContainer = document.getElementById('alertContainer');

    // Kontrolli, kas kasutaja on juba sisse logitud
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'dashboard.html';
    }

    // Lisa vormi esitamise sündmuskuulaja
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Kontrolli, kas paroolid ühtivad
        if (password !== confirmPassword) {
            showAlert('Paroolid ei ühti!', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registreerimine ebaõnnestus');
            }

            // Registreerimine õnnestus, näita teadet ja suuna sisselogimislehele
            showAlert('Registreerimine õnnestus! Suuname sind sisselogimislehele...', 'success');

            // Suuna sisselogimislehele peale 2 sekundit
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            showAlert(error.message, 'error');
        }
    });

    // Funktsioon teadete kuvamiseks
    function showAlert(message, type) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type}">
                ${message}
            </div>
        `;

        // Eemalda teade peale 5 sekundit (välja arvatud kui tegu on eduteadega)
        if (type !== 'success') {
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 5000);
        }
    }
});