const urlParams = new URLSearchParams(window.location.search);
const currentPantry = urlParams.get('pantry');
const PANTRY_NAMES = {
    almumineen: 'Al-Mumineen Food Pantry',
    alfajr: 'Al-Fajr Food Pantry',
    alhuda: 'Al-Huda Food Pantry',
    alsalam: 'Al-Salam Food Pantry',
    gcc: 'Geist Community Center Food Pantry',
};

document.addEventListener('DOMContentLoaded', function () {
    if (currentPantry && PANTRY_NAMES[currentPantry]) {
        document.getElementById('pantry-name').textContent = PANTRY_NAMES[currentPantry];
    } else {
        window.location.href = '/';
        return;
    }

    setupFormSubmission();
});

function setupFormSubmission() {
    const form = document.getElementById('donation-form');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('money-amount').value) || 0;
        if (amount <= 0) {
            alert('Please enter a valid donation amount.');
            return;
        }

        try {
            const response = await fetch('/api/donations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pantry: currentPantry,
                    amount: amount,
                    type: 'money',
                    items: null,
                }),
            });

            const result = await response.json();

            if (result.success) {
                alert(
                    `Thank you! Your donation of $${amount.toFixed(2)} has been recorded for ${
                        PANTRY_NAMES[currentPantry]
                    }.`
                );
                window.location.href = '/';
            } else {
                alert('Error recording donation. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error recording donation. Please try again.');
        }
    });
}
