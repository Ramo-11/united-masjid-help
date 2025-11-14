// ============================================
// HOME PAGE FUNCTIONALITY
// ============================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    updateAllProgress();
    loadMediaPreview();
    loadFoodItemsChart();

    // Refresh progress every 30 seconds
    setInterval(updateAllProgress, 30000);
});

// Update progress bars for all pantries
async function updateAllProgress() {
    try {
        const response = await fetch('/api/pantries');
        const pantries = await response.json();

        pantries.forEach((pantry) => {
            updateProgress(pantry.pantry, pantry.current, pantry.goal);
        });
    } catch (error) {
        console.error('Error fetching pantry data:', error);
    }
}

// Update individual pantry progress
function updateProgress(pantry, amount, goal) {
    const percentage = Math.min((amount / goal) * 100, 100);

    // Update progress bar
    const progressFill = document.getElementById(`progress-${pantry}`);
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }

    // Update amount display
    const amountDisplay = document.getElementById(`amount-${pantry}`);
    if (amountDisplay) {
        amountDisplay.textContent = '$' + amount.toFixed(2);

        // Add animation when updating
        amountDisplay.classList.add('animate-fadeIn');
        setTimeout(() => {
            amountDisplay.classList.remove('animate-fadeIn');
        }, 500);
    }

    // Update goal display
    const goalDisplay = document.getElementById(`goal-${pantry}`);
    if (goalDisplay) {
        goalDisplay.textContent = goal;
    }

    // Update percentage display
    const percentageDisplay = document.getElementById(`percentage-${pantry}`);
    if (percentageDisplay) {
        percentageDisplay.textContent = `${percentage.toFixed(1)}% Complete`;
    }

    // Add visual feedback for goals met
    const card = document.querySelector(`[data-pantry="${pantry}"]`);
    if (card && percentage >= 100) {
        card.classList.add('goal-met');
    }
}

// Load media preview for home page
async function loadMediaPreview() {
    try {
        const [mediaResponse, linksResponse] = await Promise.all([
            fetch('/api/media'),
            fetch('/api/external-links'),
        ]);

        const mediaGroups = await mediaResponse.json();
        const externalLinks = await linksResponse.json();

        const previewContainer = document.getElementById('mediaPreview');
        if (!previewContainer) return;

        let allMedia = [];

        // Add regular media
        mediaGroups.forEach((group) => {
            if (group.items && group.items.length > 0) {
                allMedia.push({
                    type: group.items[0].type,
                    title: group.title || 'Community Event',
                    thumbnail: group.items[0].url,
                    items: group.items,
                    created_at: group.created_at,
                });
            }
        });

        // Add YouTube videos
        externalLinks.forEach((link) => {
            if (link.type === 'youtube' && link.thumbnail) {
                allMedia.push({
                    type: 'youtube',
                    title: link.title,
                    thumbnail: link.thumbnail,
                    url: link.url,
                    created_at: link.created_at,
                });
            }
        });

        // Sort by date and take first 6
        allMedia.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const previewItems = allMedia.slice(0, 6);

        if (previewItems.length === 0) {
            previewContainer.innerHTML =
                '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No media available yet.</p>';
            return;
        }

        let html = '';
        previewItems.forEach((item) => {
            const typeLabel =
                item.type === 'youtube' ? 'YouTube' : item.type === 'video' ? 'Video' : 'Photo';

            html += `
                <div class="media-preview-item" onclick="window.location.href='/media.html'">
                    <img src="${item.thumbnail}" alt="${escapeHtml(
                item.title
            )}" class="media-preview-image">
                    <div class="media-preview-overlay">
                        <h3 class="media-preview-title">${escapeHtml(item.title)}</h3>
                    </div>
                    <span class="media-preview-type">${typeLabel}</span>
                    ${
                        item.type === 'video' || item.type === 'youtube'
                            ? '<div class="play-overlay" style="width: 50px; height: 50px;"></div>'
                            : ''
                    }
                </div>
            `;
        });

        previewContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading media preview:', error);
        const previewContainer = document.getElementById('mediaPreview');
        if (previewContainer) {
            previewContainer.innerHTML =
                '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Unable to load media.</p>';
        }
    }
}

// Food Items Chart Display
async function loadFoodItemsChart() {
    const pantries = ['almumineen', 'alfajr', 'alhuda'];

    for (const pantry of pantries) {
        try {
            const response = await fetch(`/api/food-goals/${pantry}`);
            const goals = await response.json();

            if (goals.length > 0) {
                createFoodItemsChart(pantry, goals);
            }
        } catch (error) {
            console.error(`Error loading food goals for ${pantry}:`, error);
        }
    }
}

function createFoodItemsChart(pantry, goals) {
    const chartContainer = document.getElementById(`food-chart-${pantry}`);
    if (!chartContainer) return;

    if (goals.length === 0) {
        // Hide the container completely when no goals
        chartContainer.style.display = 'none';
        return;
    }

    // Make sure it's visible when there are goals
    chartContainer.style.display = 'block';

    // Create a simple bar chart using CSS
    let html = '<div class="food-needs-chart">';
    html += '<h4>Current Food Needs</h4>';
    html += '<div class="chart-bars">';

    goals.forEach((goal) => {
        const percentage = Math.min((goal.achieved / goal.amount) * 100, 100);
        const needed = goal.amount - goal.achieved;

        html += `
            <div class="chart-item">
                <div class="chart-label">${goal.category}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar-fill" style="width: ${percentage}%">
                        <span class="chart-value">${goal.achieved}/${goal.amount} ${
            goal.unit
        }</span>
                    </div>
                </div>
                ${
                    needed > 0
                        ? `<div class="chart-need">Need: ${needed} ${goal.unit}</div>`
                        : '<div class="chart-complete">✓ Complete</div>'
                }
            </div>
        `;
    });

    html += '</div>';

    // Add CTA section
    html += `
        <div class="food-needs-cta">
            <p>Help us meet our weekly food goals!</p>
            <a href="/volunteer.html" class="btn btn-accent">Volunteer to Help</a>
        </div>
    `;

    html += '</div>';
    chartContainer.innerHTML = html;
}

// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Smooth scroll for donate buttons
document.querySelectorAll('a[href="#donate"]').forEach((link) => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.getElementById('donate');
        if (target) {
            const offset = 100;
            const targetPosition = target.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth',
            });
        }
    });
});
