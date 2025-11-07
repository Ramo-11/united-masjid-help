// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    loadVolunteerSlots();
    setupSlotSelection();
    setupPhoneFormatting();
    setupFormSubmission();
});

// Load volunteer slots from API
async function loadVolunteerSlots() {
    try {
        const response = await fetch('/api/slots');
        const slots = await response.json();

        populateSlotDropdown(slots);
        displayOpportunities(slots);
    } catch (error) {
        console.error('Error loading slots:', error);
    }
}

// Populate the dropdown with available slots
function populateSlotDropdown(slots) {
    const slotSelect = document.getElementById('volunteer-slot');

    // Clear existing options except the first one
    slotSelect.innerHTML = '<option value="">-- Choose a time slot --</option>';

    if (slots.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No volunteer slots available yet';
        option.disabled = true;
        slotSelect.appendChild(option);
        return;
    }

    // Filter only future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    slots.forEach((slot) => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);

        // Only show future slots that aren't full
        if (slotDate >= today && slot.signupCount < slot.max_volunteers) {
            const option = document.createElement('option');
            option.value = slot.id;

            const formattedDate = new Date(slot.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });

            option.textContent = `${formattedDate} - ${slot.time} - ${slot.location} (${slot.signupCount}/${slot.max_volunteers} signed up)`;
            slotSelect.appendChild(option);
        }
    });
}

// Display opportunities on the page
function displayOpportunities(slots) {
    const opportunitiesList = document.getElementById('opportunities-list');

    if (slots.length === 0) {
        opportunitiesList.innerHTML =
            '<p class="no-data">No volunteer opportunities available yet. Check back soon!</p>';
        return;
    }

    // Filter future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureSlots = slots.filter((slot) => {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate >= today;
    });

    if (futureSlots.length === 0) {
        opportunitiesList.innerHTML = '<p class="no-data">No upcoming volunteer opportunities.</p>';
        return;
    }

    let html = '';
    futureSlots.forEach((slot) => {
        const date = new Date(slot.date);
        const dateBadge = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const fullDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

        const isFull = slot.signupCount >= slot.max_volunteers;

        html += `
            <div class="opportunity-card ${isFull ? 'full' : ''}">
                <div class="date-badge">${dateBadge}</div>
                <h4>${slot.location}</h4>
                ${slot.address ? `<p>📍 ${slot.address}</p>` : ''}
                <p>🕐 ${fullDate}</p>
                <p>⏰ ${slot.time}</p>
                <p><strong>Type:</strong> ${slot.type}</p>
                <p><strong>Spots:</strong> ${slot.signupCount} / ${slot.max_volunteers} ${
            isFull ? '(FULL)' : ''
        }</p>
            </div>
        `;
    });

    opportunitiesList.innerHTML = html;
}

// Show slot details when selected
function setupSlotSelection() {
    const slotSelect = document.getElementById('volunteer-slot');
    const detailsDiv = document.getElementById('volunteer-details');
    const detailsText = document.getElementById('slot-details');

    slotSelect.addEventListener('change', async function () {
        const slotId = this.value;

        if (slotId) {
            try {
                const response = await fetch('/api/slots');
                const slots = await response.json();
                const slot = slots.find((s) => s.id === slotId);

                if (slot) {
                    const formattedDate = new Date(slot.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                    });

                    let html = `
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Time:</strong> ${slot.time}</p>
                        <p><strong>Location:</strong> ${slot.location}</p>
                    `;
                    if (slot.address) {
                        html += `<p><strong>Address:</strong> ${slot.address}</p>`;
                    }
                    html += `<p><strong>Type:</strong> ${slot.type}</p>`;

                    detailsText.innerHTML = html;
                    detailsDiv.style.display = 'block';
                }
            } catch (error) {
                console.error('Error fetching slot details:', error);
            }
        } else {
            detailsDiv.style.display = 'none';
        }
    });
}

// Format phone number as user types
function setupPhoneFormatting() {
    const phoneInput = document.getElementById('volunteer-phone');

    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 10) {
            value = value.substring(0, 10);
        }

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

// Handle form submission
function setupFormSubmission() {
    const form = document.getElementById('volunteer-form');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get form data
        const name = document.getElementById('volunteer-name').value.trim();
        const email = document.getElementById('volunteer-email').value.trim();
        const phone = document.getElementById('volunteer-phone').value.trim();
        const slotId = document.getElementById('volunteer-slot').value;

        // Validate
        if (!name || !email || !phone || !slotId) {
            alert('Please fill in all required fields.');
            return;
        }

        // Submit to API
        try {
            const response = await fetch('/api/volunteers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    slotId: slotId,
                    name: name,
                    email: email,
                    phone: phone,
                }),
            });

            if (response.ok) {
                // Hide form and show success message
                form.style.display = 'none';
                document.getElementById('success-message').style.display = 'block';

                // Scroll to success message
                document.getElementById('success-message').scrollIntoView({ behavior: 'smooth' });
            } else {
                const error = await response.json();
                alert(error.error || 'Error signing up. Please try again.');
                loadVolunteerSlots(); // Refresh slots
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error signing up. Please try again.');
        }
    });
}
