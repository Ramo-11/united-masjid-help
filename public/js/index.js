// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    updateAllProgress();
    // Refresh every 30 seconds
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

    const progressFill = document.getElementById(`progress-${pantry}`);
    const amountDisplay = document.getElementById(`amount-${pantry}`);
    const goalDisplay = document.getElementById(`goal-${pantry}`);

    if (progressFill && amountDisplay) {
        progressFill.style.width = percentage + '%';
        amountDisplay.textContent = '$' + amount.toFixed(2);
    }

    if (goalDisplay) {
        goalDisplay.textContent = goal;
    }
}
