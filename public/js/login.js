document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const alertContainer = document.getElementById('alertContainer');

    // Kontrolli, kas kasutaja on juba sisse logitud
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'dashboard.html';
    }

    // Lisa vormi esitamise sündmuskuulaja
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Sisselogimine ebaõnnestus');
            }

            // Salvesta token ja kasutaja info
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('expiresAt', data.expiresAt);

            // Sisselogimine õnnestus, suuna juhtpaneelile
            window.location.href = 'dashboard.html';

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

        // Eemalda teade peale 5 sekundit
        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 5000);
    }
});