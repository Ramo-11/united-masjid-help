// Load and display media gallery
document.addEventListener('DOMContentLoaded', function () {
    loadMediaGallery();
});

async function loadMediaGallery() {
    try {
        const response = await fetch('/api/media');
        const media = await response.json();

        displayMediaGallery(media);
    } catch (error) {
        console.error('Error loading media:', error);
    }
}

function displayMediaGallery(mediaItems) {
    const galleryContainer = document.getElementById('media-gallery');

    if (!galleryContainer) return;

    if (mediaItems.length === 0) {
        galleryContainer.innerHTML = `
            <div class="no-media">
                <p>📸 No media available yet</p>
                <p style="font-size: 0.95rem;">Check back soon for photos and videos of our community work!</p>
            </div>
        `;
        return;
    }

    let html = '';
    mediaItems.forEach((item) => {
        const date = new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

        html += `
            <div class="media-item" onclick="openLightbox(${item.id})">
                <div class="media-container">
                    ${
                        item.type === 'video'
                            ? `
                        <video src="${item.url}" preload="metadata"></video>
                        <div class="play-overlay"></div>
                    `
                            : `
                        <img src="${item.url}" alt="${
                                  item.title || 'Gallery image'
                              }" loading="lazy">
                    `
                    }
                    <div class="media-type-badge">${
                        item.type === 'video' ? '▶ Video' : '📷 Photo'
                    }</div>
                </div>
                ${
                    item.title || item.description
                        ? `
                    <div class="media-info">
                        ${item.title ? `<h3>${item.title}</h3>` : ''}
                        ${item.description ? `<p>${item.description}</p>` : ''}
                    </div>
                `
                        : ''
                }
            </div>
        `;
    });

    galleryContainer.innerHTML = html;

    // Store media items for lightbox
    window.mediaItems = mediaItems;
}

function openLightbox(mediaId) {
    const media = window.mediaItems.find((m) => m.id === mediaId);
    if (!media) return;

    const lightbox = document.getElementById('lightbox-modal');
    const lightboxContent = document.getElementById('lightbox-media-content');

    let mediaHTML = '';
    if (media.type === 'video') {
        mediaHTML = `<video src="${media.url}" controls autoplay style="max-width: 100%; max-height: 85vh; border-radius: 10px;"></video>`;
    } else {
        mediaHTML = `<img src="${media.url}" alt="${
            media.title || 'Gallery image'
        }" style="max-width: 100%; max-height: 85vh; border-radius: 10px;">`;
    }

    lightboxContent.innerHTML = `
        ${mediaHTML}
        ${
            media.title || media.description
                ? `
            <div class="lightbox-info">
                ${media.title ? `<h3>${media.title}</h3>` : ''}
                ${media.description ? `<p>${media.description}</p>` : ''}
            </div>
        `
                : ''
        }
    `;

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox-modal');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';

    // Stop any playing videos
    const video = lightbox.querySelector('video');
    if (video) {
        video.pause();
    }
}

// Close lightbox on escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

// Close lightbox on background click
document.addEventListener('click', function (e) {
    const lightbox = document.getElementById('lightbox-modal');
    if (e.target === lightbox) {
        closeLightbox();
    }
});
