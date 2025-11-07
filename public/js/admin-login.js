document.addEventListener('DOMContentLoaded', async function () {
    // Check if already logged in
    try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();

        if (data.authenticated) {
            window.location.href = 'admin-dashboard.html';
            return;
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
    }

    const form = document.getElementById('admin-login-form');
    const errorMessage = document.getElementById('error-message');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const password = document.getElementById('admin-password').value;

        try {
            const response = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                window.location.href = 'admin-dashboard.html';
            } else {
                errorMessage.style.display = 'block';
                document.getElementById('admin-password').value = '';
                document.getElementById('admin-password').focus();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error logging in. Please try again.');
        }
    });
});
