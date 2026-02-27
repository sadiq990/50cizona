// Login page handler
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    fetch('/api/auth/me', { credentials: 'include' })
        .then(res => {
            if (res.ok) window.location.href = '/dashboard.html';
        })
        .catch(() => { });

    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span>Gözləyin...</span>';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                window.location.href = '/dashboard.html';
            } else {
                errorEl.textContent = data.error || 'Giriş uğursuz oldu';
                errorEl.style.display = 'block';
            }
        } catch (err) {
            errorEl.textContent = 'Server ilə əlaqə qurulmadı';
            errorEl.style.display = 'block';
        }

        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Daxil ol</span>';
    });
});
