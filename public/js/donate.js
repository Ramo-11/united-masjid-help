// Get pantry from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const currentPantry = urlParams.get('pantry');

// Pantry display names
const PANTRY_NAMES = {
    almumineen: 'Al-Mumineen Food Pantry',
    alfajr: 'Al-Fajr Food Pantry',
    alhuda: 'Al-Huda Food Pantry',
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Set pantry name
    if (currentPantry && PANTRY_NAMES[currentPantry]) {
        document.getElementById('pantry-name').textContent = PANTRY_NAMES[currentPantry];
    } else {
        // Redirect to home if no valid pantry
        window.location.href = '/';
        return;
    }

    setupDonationTypeToggle();
    setupItemsCalculation();
    setupFormSubmission();
});

// Toggle between money and items sections
function setupDonationTypeToggle() {
    const radioButtons = document.querySelectorAll('input[name="donationType"]');
    const moneySection = document.getElementById('money-section');
    const itemsSection = document.getElementById('items-section');

    radioButtons.forEach((radio) => {
        radio.addEventListener('change', function () {
            if (this.value === 'money') {
                moneySection.style.display = 'block';
                itemsSection.style.display = 'none';
                // Clear items
                document
                    .querySelectorAll('input[name="item"]')
                    .forEach((cb) => (cb.checked = false));
                updateItemsTotal();
            } else {
                moneySection.style.display = 'none';
                itemsSection.style.display = 'block';
                // Clear money
                document.getElementById('money-amount').value = '';
            }
        });
    });
}

// Calculate items total
function setupItemsCalculation() {
    const itemCheckboxes = document.querySelectorAll('input[name="item"]');

    itemCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', updateItemsTotal);
    });
}

function updateItemsTotal() {
    const itemCheckboxes = document.querySelectorAll('input[name="item"]:checked');
    let total = 0;

    itemCheckboxes.forEach((checkbox) => {
        total += parseFloat(checkbox.value);
    });

    document.getElementById('items-total').textContent = total.toFixed(2);
}

// Handle form submission
function setupFormSubmission() {
    const form = document.getElementById('donation-form');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const donationType = document.querySelector('input[name="donationType"]:checked').value;
        let amount = 0;
        let items = null;

        if (donationType === 'money') {
            const moneyInput = document.getElementById('money-amount');
            amount = parseFloat(moneyInput.value) || 0;

            if (amount <= 0) {
                alert('Please enter a valid donation amount.');
                return;
            }
        } else {
            // Items donation
            const itemCheckboxes = document.querySelectorAll('input[name="item"]:checked');

            if (itemCheckboxes.length === 0) {
                alert('Please select at least one item.');
                return;
            }

            items = [];
            itemCheckboxes.forEach((checkbox) => {
                const itemAmount = parseFloat(checkbox.value);
                amount += itemAmount;
                items.push({
                    name: checkbox.getAttribute('data-name'),
                    value: itemAmount,
                });
            });
        }

        // Submit to API
        try {
            const response = await fetch('/api/donations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pantry: currentPantry,
                    amount: amount,
                    type: donationType,
                    items: items,
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
