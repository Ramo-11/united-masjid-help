// Admin password (stored in memory for API calls)
let adminPassword = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async function () {
    try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = 'admin-login.html';
            return;
        }

        // Prompt for password once for this session
        adminPassword = sessionStorage.getItem('adminPassword');

        if (!adminPassword) {
            adminPassword = prompt('Please enter admin password for verification:');
            if (!adminPassword) {
                window.location.href = 'admin-login.html';
                return;
            }
            sessionStorage.setItem('adminPassword', adminPassword);
        }

        loadPantryGoals();
        loadVolunteerSlots();
        loadVolunteerSignups();
        loadDonationHistory();

        document.getElementById('add-slot-form').addEventListener('submit', handleAddSlot);
    } catch (error) {
        console.error('Error:', error);
        window.location.href = 'admin-login.html';
    }
});

// Logout function
async function logout() {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach((tab) => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.classList.remove('active');
    });

    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
}

// Pantry Goals Management
async function loadPantryGoals() {
    try {
        const response = await fetch('/api/pantries');
        const pantries = await response.json();

        pantries.forEach((pantry) => {
            const input = document.getElementById(`goal-${pantry.pantry}`);
            if (input) {
                input.value = pantry.goal;
            }
        });
    } catch (error) {
        console.error('Error loading goals:', error);
    }
}

async function updateGoal(pantry) {
    const goalInput = document.getElementById('goal-' + pantry);
    const newGoal = parseFloat(goalInput.value);

    if (newGoal <= 0) {
        alert('Goal must be greater than 0');
        return;
    }

    try {
        const response = await fetch(`/api/admin/goal/${pantry}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: adminPassword, goal: newGoal }),
        });

        if (response.ok) {
            alert('Goal updated successfully!');
        } else {
            alert('Error updating goal. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating goal.');
    }
}

// Volunteer Slots Management
async function handleAddSlot(e) {
    e.preventDefault();

    const date = document.getElementById('slot-date').value;
    const time = document.getElementById('slot-time').value;
    const location = document.getElementById('slot-location').value;
    const address = document.getElementById('slot-address').value;
    const type = document.getElementById('slot-type').value;
    const maxVolunteers = parseInt(document.getElementById('slot-max').value);

    const slot = {
        id: Date.now().toString(),
        date: date,
        time: time,
        location: location,
        address: address,
        type: type,
        maxVolunteers: maxVolunteers,
        password: adminPassword,
    };

    try {
        const response = await fetch('/api/admin/slots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(slot),
        });

        if (response.ok) {
            document.getElementById('add-slot-form').reset();
            loadVolunteerSlots();
            alert('Volunteer slot added successfully!');
        } else {
            alert('Error adding slot. Please try again.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding slot.');
    }
}

async function loadVolunteerSlots() {
    try {
        const response = await fetch('/api/slots');
        const slots = await response.json();
        const slotsList = document.getElementById('slots-list');

        if (slots.length === 0) {
            slotsList.innerHTML = '<p class="no-data">No volunteer slots created yet.</p>';
            return;
        }

        let html = '';
        slots.forEach((slot) => {
            const formattedDate = new Date(slot.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

            let badgeClass = 'badge-other';
            if (slot.type === 'Distribution') badgeClass = 'badge-distribution';
            if (slot.type === 'Transportation') badgeClass = 'badge-transportation';

            html += `
                <div class="slot-item">
                    <div style="display: flex; gap: 0.5rem; position: absolute; top: 1rem; right: 1rem;">
                        <button class="delete-btn" style="background: #ffc107;" onclick="clearSlotVolunteers('${
                            slot.id
                        }', '${slot.location}')">Clear Volunteers</button>
                        <button class="delete-btn" onclick="deleteSlot('${
                            slot.id
                        }')">Delete Slot</button>
                    </div>
                    <h4>${slot.location}</h4>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Time:</strong> ${slot.time}</p>
                    ${slot.address ? `<p><strong>Address:</strong> ${slot.address}</p>` : ''}
                    <p><strong>Volunteers:</strong> ${slot.signupCount} / ${slot.max_volunteers}</p>
                    <span class="badge ${badgeClass}">${slot.type}</span>
                </div>
            `;
        });

        slotsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading slots:', error);
    }
}

async function deleteSlot(slotId) {
    if (
        !confirm(
            'Are you sure you want to delete this volunteer slot? This will also remove all sign-ups for this slot.'
        )
    ) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/slots/${slotId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: adminPassword }),
        });

        if (response.ok) {
            loadVolunteerSlots();
            loadVolunteerSignups();
        } else {
            alert('Error deleting slot.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting slot.');
    }
}

async function clearSlotVolunteers(slotId, locationName) {
    if (
        !confirm(
            `Are you sure you want to clear all volunteers for "${locationName}"? This cannot be undone!`
        )
    ) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/volunteers/${slotId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: adminPassword }),
        });

        if (response.ok) {
            alert('Volunteers cleared successfully.');
            loadVolunteerSlots();
            loadVolunteerSignups();
        } else {
            alert('Error clearing volunteers.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error clearing volunteers.');
    }
}

// Volunteer Signups Management
async function loadVolunteerSignups() {
    try {
        const response = await fetch('/api/admin/volunteers');
        const volunteers = await response.json();
        const signupsList = document.getElementById('signups-list');

        if (volunteers.length === 0) {
            signupsList.innerHTML = '<p class="no-data">No volunteer sign-ups yet.</p>';
            return;
        }

        let html = '<div class="signups-table"><table>';
        html +=
            '<thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Slot</th><th>Date</th></tr></thead>';
        html += '<tbody>';

        volunteers.forEach((volunteer) => {
            const dateInfo = new Date(volunteer.date).toLocaleDateString();

            html += `
                <tr>
                    <td>${volunteer.name}</td>
                    <td>${volunteer.email}</td>
                    <td>${volunteer.phone}</td>
                    <td>${volunteer.location} - ${volunteer.time}</td>
                    <td>${dateInfo}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        signupsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading signups:', error);
    }
}

async function exportVolunteers() {
    try {
        const response = await fetch('/api/admin/volunteers');
        const volunteers = await response.json();

        if (volunteers.length === 0) {
            alert('No volunteers to export.');
            return;
        }

        let csv = 'Name,Email,Phone,Location,Date,Time,Type\n';

        volunteers.forEach((volunteer) => {
            const date = new Date(volunteer.date).toLocaleDateString();
            csv += `"${volunteer.name}","${volunteer.email}","${volunteer.phone}","${volunteer.location}","${date}","${volunteer.time}","${volunteer.type}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'volunteers_' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error:', error);
        alert('Error exporting volunteers.');
    }
}

async function clearAllSignups() {
    if (!confirm('Are you sure you want to clear ALL volunteer sign-ups? This cannot be undone!')) {
        return;
    }

    try {
        const response = await fetch('/api/admin/volunteers/all', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: adminPassword }),
        });

        if (response.ok) {
            alert('All volunteer sign-ups have been cleared.');
            loadVolunteerSignups();
            loadVolunteerSlots();
        } else {
            alert('Error clearing sign-ups.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error clearing sign-ups.');
    }
}

// Donation History Management
async function loadDonationHistory() {
    const filterRadio = document.querySelector('input[name="pantryFilter"]:checked');
    const filter = filterRadio ? filterRadio.value : 'all';

    try {
        const url = filter === 'all' ? '/api/donations' : `/api/donations?pantry=${filter}`;
        const response = await fetch(url);
        const donations = await response.json();
        const donationsList = document.getElementById('donations-list');

        if (donations.length === 0) {
            donationsList.innerHTML = '<p class="no-data">No donations recorded yet.</p>';
            return;
        }

        const total = donations.reduce((sum, d) => sum + d.amount, 0);

        let html =
            '<div class="donation-summary" style="margin-bottom: 1.5rem; padding: 1rem; background: #f0f7ff; border-radius: 8px;">';
        html += `<h4 style="color: #667eea; margin: 0;">Total: $${total.toFixed(2)} (${
            donations.length
        } donations)</h4>`;
        html += '</div>';

        html += '<div class="signups-table"><table>';
        html +=
            '<thead><tr><th>Date & Time</th><th>Pantry</th><th>Amount</th><th>Type</th><th>Details</th></tr></thead>';
        html += '<tbody>';

        const PANTRY_NAMES = {
            almumineen: 'Al-Mumineen',
            alfajr: 'Al-Fajr',
            alhuda: 'Al-Huda',
        };

        donations.forEach((donation) => {
            const date = new Date(donation.created_at);
            const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
            const timeStr = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });

            let details = donation.type === 'money' ? 'Cash/Online' : '';
            if (donation.type === 'items' && donation.items) {
                const items = JSON.parse(donation.items);
                details = items.map((item) => item.name).join(', ');
            }

            html += `
                <tr>
                    <td>${dateStr} ${timeStr}</td>
                    <td>${PANTRY_NAMES[donation.pantry] || donation.pantry}</td>
                    <td><strong>$${donation.amount.toFixed(2)}</strong></td>
                    <td>${donation.type === 'money' ? 'Money' : 'Items'}</td>
                    <td>${details}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        donationsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading donations:', error);
    }
}

async function exportDonations() {
    try {
        const response = await fetch('/api/donations');
        const donations = await response.json();

        if (donations.length === 0) {
            alert('No donations to export.');
            return;
        }

        const PANTRY_NAMES = {
            almumineen: 'Al-Mumineen',
            alfajr: 'Al-Fajr',
            alhuda: 'Al-Huda',
        };

        let csv = 'Date,Time,Pantry,Amount,Type,Details\n';

        donations.forEach((donation) => {
            const date = new Date(donation.created_at);
            const dateStr = date.toLocaleDateString('en-US');
            const timeStr = date.toLocaleTimeString('en-US');

            let details = donation.type === 'money' ? 'Cash/Online' : '';
            if (donation.type === 'items' && donation.items) {
                const items = JSON.parse(donation.items);
                details = items.map((item) => `${item.name} ($${item.value})`).join('; ');
            }

            csv += `"${dateStr}","${timeStr}","${
                PANTRY_NAMES[donation.pantry]
            }","${donation.amount.toFixed(2)}","${donation.type}","${details}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'donations_' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error:', error);
        alert('Error exporting donations.');
    }
}

async function clearPantryDonations(pantry) {
    const pantryNames = {
        almumineen: 'Al-Mumineen',
        alfajr: 'Al-Fajr',
        alhuda: 'Al-Huda',
        all: 'ALL pantries',
    };

    if (
        !confirm(
            `Are you sure you want to clear donation history for ${pantryNames[pantry]}? This will NOT reset current week totals, only the history log. This cannot be undone!`
        )
    ) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/donations/${pantry}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: adminPassword }),
        });

        if (response.ok) {
            alert('Donation history cleared successfully.');
            loadDonationHistory();
        } else {
            alert('Error clearing donations.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error clearing donations.');
    }
}

function clearAllDonations() {
    clearPantryDonations('all');
}
