// public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // Kontrolli, kas kasutaja on sisse logitud
    const token = localStorage.getItem('token');

    // Kontrolli lehe tüüpi
    const isAuthPage = window.location.pathname.includes('login.html') ||
        window.location.pathname.includes('register.html');
    const isDashboardPage = window.location.pathname.includes('dashboard.html');

    // Suuna kasutaja õigele lehele
    if (token && isAuthPage) {
        // Kui kasutaja on sisse logitud, aga külastab registreerimis- või sisselogimislehte
        window.location.href = 'dashboard.html';
    } else if (!token && isDashboardPage) {
        // Kui kasutaja pole sisse logitud, aga proovib pääseda juhtpaneelile
        window.location.href = 'login.html';
    }

    // Tokeni aegumise kontroll
    if (token) {
        const expiresAt = localStorage.getItem('expiresAt');
        if (expiresAt && new Date() > new Date(expiresAt)) {
            // Token on aegunud
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('userId');
            localStorage.removeItem('expiresAt');

            // Kui kasutaja pole autentimislehel, suuna ta sisselogimislehele
            if (!isAuthPage) {
                window.location.href = 'login.html';
            }
        }
    }
});