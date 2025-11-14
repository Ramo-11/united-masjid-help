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
        loadFoodItemGoals();

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
    const pantry = type === 'Item Donation' ? document.getElementById('slot-pantry').value : null;

    const slot = {
        id: Date.now().toString(),
        date: date,
        time: time,
        location: location,
        address: address,
        type: type,
        maxVolunteers: maxVolunteers,
        pantry: pantry,
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

// Add this to show/hide pantry selection based on type
function togglePantrySelection() {
    const type = document.getElementById('slot-type').value;
    const pantryGroup = document.getElementById('pantry-selection-group');

    if (type === 'Item Donation') {
        pantryGroup.style.display = 'block';
    } else {
        pantryGroup.style.display = 'none';
    }
}

async function loadVolunteerSlots() {
    try {
        const response = await fetch('/api/admin/all-slots');
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
            if (slot.type === 'Item Donation') badgeClass = 'badge-donation';

            // Check if slot is completed
            const isCompleted = slot.completed === 1 || slot.completed === true;

            html += `
                <div class="slot-item ${isCompleted ? 'completed-slot' : ''}" id="slot-${
                slot.id
            }" ${isCompleted ? 'style="opacity: 0.6; background: #e9ecef;"' : ''}>
                    ${
                        isCompleted
                            ? '<span class="badge" style="background: #28a745; position: absolute; top: 10px; left: 10px;">✓ COMPLETED</span>'
                            : ''
                    }
                    <div class="actions" style="display: flex; gap: 0.5rem; position: absolute; top: 1rem; right: 1rem; z-index: 10;">
                        <button class="delete-btn" style="background: #28a745;" onclick="toggleEditSlot('${
                            slot.id
                        }')">Edit</button>
                        ${
                            !isCompleted
                                ? `<button class="delete-btn" style="background: #17a2b8;" onclick="markSlotComplete('${slot.id}', '${slot.location}')">Complete</button>`
                                : ''
                        }
                        <button class="delete-btn" style="background: #ffc107;" onclick="clearSlotVolunteers('${
                            slot.id
                        }', '${slot.location}')">Clear</button>
                        <button class="delete-btn" onclick="deleteSlot('${
                            slot.id
                        }')">Delete</button>
                    </div>
                    <div class="slot-view-mode" id="view-${slot.id}">
                        <h4>${slot.location}</h4>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Time:</strong> ${slot.time}</p>
                        ${slot.address ? `<p><strong>Address:</strong> ${slot.address}</p>` : ''}
                        <p><strong>Type:</strong> ${slot.type}</p>
                        ${
                            slot.type === 'Item Donation' && slot.pantry
                                ? `<p><strong>Pantry:</strong> ${getPantryDisplayName(
                                      slot.pantry
                                  )}</p>`
                                : ''
                        }
                        <p><strong>Volunteers:</strong> ${slot.signupCount} / ${
                slot.max_volunteers
            }</p>
                        <span class="badge ${badgeClass}">${slot.type}</span>
                    </div>
                    <div class="slot-edit-mode" id="edit-${slot.id}" style="display: none;">
                        <input type="date" id="date-${slot.id}" value="${
                slot.date
            }" class="form-control" />
                        <input type="text" id="time-${slot.id}" value="${
                slot.time
            }" placeholder="Time" class="form-control" />
                        <input type="text" id="location-${slot.id}" value="${
                slot.location
            }" placeholder="Location" class="form-control" />
                        <input type="text" id="address-${slot.id}" value="${
                slot.address || ''
            }" placeholder="Address" class="form-control" />
                        <input type="number" id="max-${slot.id}" value="${
                slot.max_volunteers
            }" min="1" class="form-control" />
                        <select id="type-${
                            slot.id
                        }" class="form-control" onchange="toggleEditPantry('${slot.id}')">
                            <option value="Distribution" ${
                                slot.type === 'Distribution' ? 'selected' : ''
                            }>Distribution</option>
                            <option value="Transportation" ${
                                slot.type === 'Transportation' ? 'selected' : ''
                            }>Transportation</option>
                            <option value="Item Donation" ${
                                slot.type === 'Item Donation' ? 'selected' : ''
                            }>Item Donation</option>
                            <option value="Other" ${
                                slot.type === 'Other' ? 'selected' : ''
                            }>Other</option>
                        </select>
                        <select id="pantry-${slot.id}" class="form-control" style="${
                slot.type === 'Item Donation' ? '' : 'display: none;'
            }">
                            <option value="almumineen" ${
                                slot.pantry === 'almumineen' ? 'selected' : ''
                            }>Al-Mumineen</option>
                            <option value="alfajr" ${
                                slot.pantry === 'alfajr' ? 'selected' : ''
                            }>Al-Fajr</option>
                            <option value="alhuda" ${
                                slot.pantry === 'alhuda' ? 'selected' : ''
                            }>Al-Huda</option>
                        </select>
                        <div style="margin-top: 1rem;">
                            <button onclick="saveSlotEdits('${
                                slot.id
                            }')" class="btn btn-primary">Save</button>
                            <button onclick="toggleEditSlot('${
                                slot.id
                            }')" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
        });

        slotsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading slots:', error);
    }
}

function toggleEditSlot(slotId) {
    const viewMode = document.getElementById(`view-${slotId}`);
    const editMode = document.getElementById(`edit-${slotId}`);

    if (viewMode.style.display === 'none') {
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
    } else {
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
    }
}

function toggleEditPantry(slotId) {
    const type = document.getElementById(`type-${slotId}`).value;
    const pantrySelect = document.getElementById(`pantry-${slotId}`);

    if (type === 'Item Donation') {
        pantrySelect.style.display = 'block';
    } else {
        pantrySelect.style.display = 'none';
    }
}

async function saveSlotEdits(slotId) {
    const date = document.getElementById(`date-${slotId}`).value;
    const time = document.getElementById(`time-${slotId}`).value;
    const location = document.getElementById(`location-${slotId}`).value;
    const address = document.getElementById(`address-${slotId}`).value;
    const maxVolunteers = document.getElementById(`max-${slotId}`).value;
    const type = document.getElementById(`type-${slotId}`).value;
    const pantry =
        type === 'Item Donation' ? document.getElementById(`pantry-${slotId}`).value : null;

    try {
        const response = await fetch(`/api/admin/slots/${slotId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: adminPassword,
                date,
                time,
                location,
                address,
                maxVolunteers,
                type,
                pantry,
            }),
        });

        if (response.ok) {
            loadVolunteerSlots();
            showNotification('Slot updated successfully!', 'success');
        }
    } catch (error) {
        console.error('Error updating slot:', error);
        showNotification('Error updating slot', 'error');
    }
}

async function markSlotComplete(slotId, locationName) {
    if (!confirm(`Mark "${locationName}" as complete? This will archive the slot.`)) return;

    try {
        const response = await fetch(`/api/admin/slots/${slotId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword }),
        });

        if (response.ok) {
            loadVolunteerSlots();
            showNotification('Slot marked as complete!', 'success');
        }
    } catch (error) {
        console.error('Error marking slot complete:', error);
        showNotification('Error marking slot as complete', 'error');
    }
}

function getPantryDisplayName(pantry) {
    const names = {
        almumineen: 'Al-Mumineen',
        alfajr: 'Al-Fajr',
        alhuda: 'Al-Huda',
    };
    return names[pantry] || pantry;
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

// Food Item Goals Management
async function loadFoodItemGoals() {
    const pantries = ['almumineen', 'alfajr', 'alhuda'];

    for (const pantry of pantries) {
        try {
            const response = await fetch(`/api/food-goals/${pantry}`);
            const goals = await response.json();
            displayFoodItemGoals(pantry, goals);
            updateFoodGoalsSummary(pantry, goals);
        } catch (error) {
            console.error(`Error loading food goals for ${pantry}:`, error);
        }
    }
}

function displayFoodItemGoals(pantry, goals) {
    const container = document.getElementById(`food-goals-${pantry}`);
    if (!container) return;

    if (goals.length === 0) {
        container.innerHTML = '<p class="no-food-goals">No food goals set yet.</p>';
        return;
    }

    let html = '<div class="food-goals-grid">';

    goals.forEach((goal) => {
        const percentage = Math.min((goal.achieved / goal.amount) * 100, 100);
        const isComplete = goal.achieved >= goal.amount;
        const needed = Math.max(0, goal.amount - goal.achieved);

        html += `
            <div class="food-goal-card ${isComplete ? 'complete' : ''}">
                <div class="food-goal-header">
                    <h5 class="food-category-title">${goal.category}</h5>
                    <button class="food-goal-delete" onclick="deleteFoodGoal('${pantry}', '${
            goal.category
        }')" title="Delete Goal">
                        <span class="delete-icon">×</span>
                    </button>
                </div>
                
                <div class="food-goal-stats">
                    <div class="stat-row">
                        <span class="stat-label">Progress:</span>
                        <span class="stat-value">${goal.achieved} / ${goal.amount} ${
            goal.unit
        }</span>
                    </div>
                    ${
                        needed > 0
                            ? `
                        <div class="stat-row">
                            <span class="stat-label needed">Still Needed:</span>
                            <span class="stat-value needed">${needed} ${goal.unit}</span>
                        </div>
                    `
                            : ''
                    }
                </div>
                
                <div class="food-goal-progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill ${
                            isComplete ? 'complete' : ''
                        }" style="width: ${percentage}%">
                            <span class="progress-percent">${Math.round(percentage)}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="food-goal-actions">
                    <div class="contribution-form">
                        <input type="number" 
                               id="contribute-${pantry}-${goal.category.replace(/\s+/g, '-')}" 
                               placeholder="Amount" 
                               min="1" 
                               class="contribution-input">
                        <input type="text" 
                               id="contributor-${pantry}-${goal.category.replace(/\s+/g, '-')}" 
                               placeholder="Contributor (optional)" 
                               class="contributor-input">
                        <button onclick="addContribution('${pantry}', '${goal.category}')" 
                                class="btn-contribute">
                            Add
                        </button>
                    </div>
                    ${
                        !isComplete
                            ? `
                        <button onclick="markComplete('${pantry}', '${goal.category}')" 
                                class="btn-mark-complete">
                            Mark Complete
                        </button>
                    `
                            : `
                        <span class="complete-badge">✓ Complete</span>
                    `
                    }
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function updateFoodGoalsSummary(pantry, goals) {
    const summaryContainer = document.getElementById(`food-summary-${pantry}`);
    if (!summaryContainer) return;

    const totalGoals = goals.length;
    const completedGoals = goals.filter((g) => g.achieved >= g.amount).length;
    const overallPercentage = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    summaryContainer.innerHTML = `
        <div class="food-summary-card">
            <div class="summary-stat">
                <span class="summary-label">Total Goals</span>
                <span class="summary-value">${totalGoals}</span>
            </div>
            <div class="summary-stat">
                <span class="summary-label">Completed</span>
                <span class="summary-value success">${completedGoals}</span>
            </div>
            <div class="summary-stat">
                <span class="summary-label">Overall Progress</span>
                <span class="summary-value">${overallPercentage}%</span>
            </div>
        </div>
    `;
}

async function addContribution(pantry, category) {
    const categoryId = category.replace(/\s+/g, '-');
    const amountInput = document.getElementById(`contribute-${pantry}-${categoryId}`);
    const contributorInput = document.getElementById(`contributor-${pantry}-${categoryId}`);

    const amount = parseInt(amountInput.value);
    const contributor = contributorInput.value.trim();

    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    try {
        const response = await fetch('/api/admin/food-goals/contribute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: adminPassword,
                pantry,
                category,
                amount,
                contributorName: contributor || 'Anonymous',
            }),
        });

        if (response.ok) {
            amountInput.value = '';
            contributorInput.value = '';
            loadFoodItemGoals();
            showNotification('Contribution added successfully!', 'success');
        }
    } catch (error) {
        console.error('Error adding contribution:', error);
        showNotification('Error adding contribution', 'error');
    }
}

async function markComplete(pantry, category) {
    if (!confirm(`Mark "${category}" as complete for this week?`)) return;

    try {
        const response = await fetch('/api/admin/food-goals/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: adminPassword,
                pantry,
                category,
            }),
        });

        if (response.ok) {
            loadFoodItemGoals();
            showNotification(`${category} marked as complete!`, 'success');
        }
    } catch (error) {
        console.error('Error marking complete:', error);
        showNotification('Error marking as complete', 'error');
    }
}

async function deleteFoodGoal(pantry, category) {
    if (
        !confirm(
            `Are you sure you want to delete the goal for "${category}"? This action cannot be undone.`
        )
    )
        return;

    try {
        const response = await fetch(
            `/api/admin/food-goals/${pantry}/${encodeURIComponent(category)}`,
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword }),
            }
        );

        if (response.ok) {
            loadFoodItemGoals();
            showNotification('Goal deleted successfully', 'info');
        }
    } catch (error) {
        console.error('Error deleting food goal:', error);
        showNotification('Error deleting goal', 'error');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function addFoodItemGoal(pantry) {
    const category = document.getElementById(`food-category-${pantry}`).value;
    const amount = document.getElementById(`food-amount-${pantry}`).value;
    const unit = document.getElementById(`food-unit-${pantry}`).value;

    if (!category || !amount || !unit) {
        alert('Please fill all fields');
        return;
    }

    try {
        const response = await fetch('/api/admin/food-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: adminPassword,
                pantry,
                category,
                amount: parseInt(amount),
                unit,
            }),
        });

        if (response.ok) {
            alert('Food goal added successfully!');
            document.getElementById(`food-category-${pantry}`).value = '';
            document.getElementById(`food-amount-${pantry}`).value = '';
            document.getElementById(`food-unit-${pantry}`).value = '';
            loadFoodItemGoals();
        }
    } catch (error) {
        console.error('Error adding food goal:', error);
    }
}
