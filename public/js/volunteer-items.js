let currentPantry = null;
let pantryAddresses = {};
let foodGoals = [];

document.addEventListener('DOMContentLoaded', async function () {
    // Get pantry from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentPantry = urlParams.get('pantry');

    if (!currentPantry) {
        window.location.href = '/';
        return;
    }

    // Set minimum date to today
    document.getElementById('delivery-date').min = new Date().toISOString().split('T')[0];

    // Load data
    await loadPantryInfo();
    await loadFoodNeeds();

    // Setup form
    setupPhoneFormatting();
    setupFormSubmission();
});

async function loadPantryInfo() {
    try {
        const response = await fetch('/api/pantry-addresses');
        pantryAddresses = await response.json();

        const pantryInfo = pantryAddresses[currentPantry];
        if (!pantryInfo) {
            window.location.href = '/';
            return;
        }

        // Display pantry name
        document.getElementById('pantry-name').textContent = pantryInfo.name;

        // Display address info
        let addressHtml = `
            <p><strong>Address:</strong> ${pantryInfo.address}</p>
            <p><strong>Hours:</strong> ${pantryInfo.hours}</p>
        `;
        if (pantryInfo.notes) {
            addressHtml += `<p><em>${pantryInfo.notes}</em></p>`;
        }

        document.getElementById('address-details').innerHTML = addressHtml;
    } catch (error) {
        console.error('Error loading pantry info:', error);
    }
}

async function loadFoodNeeds() {
    try {
        const response = await fetch(`/api/food-goals/${currentPantry}`);
        foodGoals = await response.json();

        const itemsList = document.getElementById('food-items-list');

        if (foodGoals.length === 0) {
            itemsList.innerHTML =
                '<p>No specific food needs at the moment. Please contact the pantry for general needs.</p>';
            return;
        }

        let html = '<div class="item-category">';
        html += '<h4>Needed Items</h4>';

        foodGoals.forEach((goal) => {
            const needed = Math.max(0, goal.amount - goal.achieved);
            if (needed > 0) {
                html += `
                    <label>
                        <input type="checkbox" name="food-item" 
                               value="${goal.category}" 
                               data-unit="${goal.unit}"
                               data-needed="${needed}">
                        <span>${goal.category} (Need: ${needed} ${goal.unit})</span>
                    </label>
                    <input type="number" 
                           id="amount-${goal.category.replace(/\s+/g, '-')}" 
                           placeholder="Amount to bring" 
                           min="1" 
                           max="${needed}"
                           style="margin-left: 2rem; width: 200px; display: none;"
                           class="item-amount-input">
                `;
            }
        });

        html += '</div>';
        itemsList.innerHTML = html;

        // Show/hide amount inputs based on checkbox
        document.querySelectorAll('input[name="food-item"]').forEach((checkbox) => {
            checkbox.addEventListener('change', function () {
                const amountInput = document.getElementById(
                    `amount-${this.value.replace(/\s+/g, '-')}`
                );
                if (amountInput) {
                    amountInput.style.display = this.checked ? 'block' : 'none';
                    if (!this.checked) amountInput.value = '';
                }
            });
        });
    } catch (error) {
        console.error('Error loading food needs:', error);
    }
}

function setupPhoneFormatting() {
    const phoneInput = document.getElementById('volunteer-phone');
    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) value = value.substring(0, 10);

        if (value.length >= 6) {
            value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
        } else if (value.length >= 3) {
            value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
        } else if (value.length > 0) {
            value = `(${value}`;
        }

        e.target.value = value;
    });
}

async function setupFormSubmission() {
    const form = document.getElementById('item-donation-form');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Collect selected items
        const selectedItems = [];
        document.querySelectorAll('input[name="food-item"]:checked').forEach((checkbox) => {
            const amountInput = document.getElementById(
                `amount-${checkbox.value.replace(/\s+/g, '-')}`
            );
            const amount = amountInput ? parseInt(amountInput.value) : 1;

            if (amount > 0) {
                selectedItems.push({
                    category: checkbox.value,
                    amount: amount,
                    unit: checkbox.dataset.unit,
                });
            }
        });

        if (selectedItems.length === 0) {
            alert('Please select at least one item to bring.');
            return;
        }

        const data = {
            pantry: currentPantry,
            name: document.getElementById('volunteer-name').value.trim(),
            email: document.getElementById('volunteer-email').value.trim(),
            phone: document.getElementById('volunteer-phone').value.trim(),
            items: selectedItems,
            date: document.getElementById('delivery-date').value,
            time: document.getElementById('delivery-time').value,
            notes: document.getElementById('notes').value.trim(),
        };

        try {
            const response = await fetch('/api/item-donation-volunteer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                form.style.display = 'none';
                document.getElementById('success-message').style.display = 'block';
                document.getElementById('success-message').scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('Error signing up. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error signing up. Please try again.');
        }
    });
}
