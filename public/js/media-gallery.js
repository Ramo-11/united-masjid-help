// ============================================
// MEDIA GALLERY FUNCTIONALITY
// ============================================

let allMedia = [];
let filteredMedia = [];
let currentFilter = 'all';
let currentLightboxIndex = 0;
let itemsPerPage = 12;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', function () {
    loadMediaGallery();
    setupFilterButtons();
    setupLightbox();
});

// Load media from API
async function loadMediaGallery() {
    try {
        const [mediaResponse, linksResponse] = await Promise.all([
            fetch('/api/media'),
            fetch('/api/external-links'),
        ]);

        const mediaGroups = await mediaResponse.json();
        const externalLinks = await linksResponse.json();

        // Process media groups
        allMedia = [];

        // Add regular media
        mediaGroups.forEach((group) => {
            allMedia.push({
                type: group.items[0].type === 'video' ? 'videos' : 'photos',
                title: group.title || 'Untitled',
                description: group.description || '',
                items: group.items,
                created_at: group.created_at,
                group_id: group.group_id,
                category: 'events',
            });
        });

        // Add external links
        externalLinks.forEach((link) => {
            if (link.type === 'youtube') {
                allMedia.push({
                    type: 'videos',
                    title: link.title,
                    description: link.description || '',
                    url: link.url,
                    embedUrl: link.embedUrl,
                    thumbnail: link.thumbnail,
                    linkType: 'youtube',
                    created_at: link.created_at,
                    category: 'events',
                });
            } else if (link.type === 'facebook') {
                allMedia.push({
                    type: 'facebook',
                    title: link.title,
                    description: link.description || '',
                    url: link.url,
                    embedUrl: link.embedUrl,
                    linkType: 'facebook',
                    created_at: link.created_at,
                    category: 'events',
                });
            }
        });

        // Sort by date
        allMedia.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        filterMedia('all');
    } catch (error) {
        console.error('Error loading media:', error);
        showError();
    }
}

// Filter media
function filterMedia(filter) {
    currentFilter = filter;
    currentPage = 1;

    if (filter === 'all') {
        filteredMedia = [...allMedia];
    } else if (filter === 'facebook') {
        filteredMedia = allMedia.filter((item) => item.type === 'facebook');
    } else {
        filteredMedia = allMedia.filter((item) => item.type === filter || item.category === filter);
    }

    renderGallery();
    updateLoadMoreButton();
}

// Render gallery
function renderGallery() {
    const gallery = document.getElementById('mediaGallery');
    const endIndex = currentPage * itemsPerPage;
    const displayItems = filteredMedia.slice(0, endIndex);

    if (displayItems.length === 0) {
        gallery.innerHTML =
            '<div class="loading-placeholder"><p>No media found for this filter.</p></div>';
        return;
    }

    let html = '';

    displayItems.forEach((item, index) => {
        const date = new Date(item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

        if (item.linkType === 'youtube') {
            html += `
                <div class="media-item" onclick="openYouTubeLightbox('${
                    item.embedUrl
                }', '${escapeHtml(item.title)}', '${escapeHtml(item.description || '')}')">
                    <div class="media-thumbnail">
                        <img src="${item.thumbnail}" alt="${escapeHtml(item.title)}" />
                        <div class="play-overlay"></div>
                        <span class="media-type-badge video">YouTube</span>
                    </div>
                    <div class="media-info">
                        <h3 class="media-title">${escapeHtml(item.title)}</h3>
                        ${
                            item.description
                                ? `<p class="media-description">${escapeHtml(item.description)}</p>`
                                : ''
                        }
                        <div class="media-meta">
                            <span class="media-date">${date}</span>
                        </div>
                    </div>
                </div>
            `;
        } else if (item.linkType === 'facebook') {
            html += `
                <div class="media-item" onclick="openFacebookLightbox('${
                    item.embedUrl
                }', '${escapeHtml(item.title)}', '${escapeHtml(item.description || '')}')">
                    <div class="media-thumbnail">
                        <div class="facebook-preview">
                            <span class="facebook-icon">f</span>
                        </div>
                        <span class="media-type-badge facebook">Facebook Post</span>
                    </div>
                    <div class="media-info">
                        <h3 class="media-title">${escapeHtml(item.title)}</h3>
                        ${
                            item.description
                                ? `<p class="media-description">${escapeHtml(item.description)}</p>`
                                : ''
                        }
                        <div class="media-meta">
                            <span class="media-date">${date}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const firstItem = item.items[0];
            const hasMultiple = item.items.length > 1;

            if (hasMultiple) {
                // Multi-item carousel
                html += `
                    <div class="media-item" onclick="openMediaLightbox(${index})">
                        <div class="media-thumbnail">
                            <div class="media-carousel" data-group-id="${item.group_id}">
                                <!-- rest of carousel code stays the same -->
                                <div class="carousel-track" id="track-${item.group_id}">
                                    ${item.items
                                        .map(
                                            (media, idx) => `
                                        <div class="carousel-slide">
                                            ${
                                                media.type === 'video'
                                                    ? `<video src="${media.url}"></video>`
                                                    : `<img src="${media.url}" alt="${escapeHtml(
                                                          item.title
                                                      )}" />`
                                            }
                                        </div>
                                    `
                                        )
                                        .join('')}
                                </div>
                                <button class="carousel-arrow prev" onclick="event.stopPropagation(); carouselPrev('${
                                    item.group_id
                                }')">‹</button>
                                <button class="carousel-arrow next" onclick="event.stopPropagation(); carouselNext('${
                                    item.group_id
                                }')">›</button>
                                <div class="carousel-indicators">
                                    ${item.items
                                        .map(
                                            (_, idx) => `
                                        <button class="carousel-dot ${idx === 0 ? 'active' : ''}" 
                                                onclick="event.stopPropagation(); carouselGoTo('${
                                                    item.group_id
                                                }', ${idx})"></button>
                                    `
                                        )
                                        .join('')}
                                </div>
                            </div>
                            <span class="media-type-badge ${
                                firstItem.type === 'video' ? 'video' : 'photo'
                            }">
                                ${item.items.length} items
                            </span>
                            ${firstItem.type === 'video' ? '<div class="play-overlay"></div>' : ''}
                        </div>
                        <div class="media-info">
                            <h3 class="media-title">${escapeHtml(item.title)}</h3>
                            ${
                                item.description
                                    ? `<p class="media-description">${escapeHtml(
                                          item.description
                                      )}</p>`
                                    : ''
                            }
                            <div class="media-meta">
                                <span class="media-date">${date}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Single item
                html += `
        <div class="media-item" onclick="openMediaLightbox(${index})">
            <div class="media-thumbnail">
                ${
                    firstItem.type === 'video'
                        ? `<video src="${firstItem.url}"></video><div class="play-overlay"></div>`
                        : `<img src="${firstItem.url}" alt="${escapeHtml(item.title)}" />`
                }
                <span class="media-type-badge ${firstItem.type === 'video' ? 'video' : 'photo'}">
                    ${firstItem.type === 'video' ? 'Video' : 'Photo'}
                </span>
            </div>
            <div class="media-info">
                <h3 class="media-title">${escapeHtml(item.title)}</h3>
                ${
                    item.description
                        ? `<p class="media-description">${escapeHtml(item.description)}</p>`
                        : ''
                }
                <div class="media-meta">
                    <span class="media-date">${date}</span>
                </div>
            </div>
        </div>
    `;
            }
        }
    });

    gallery.innerHTML = html;

    // Initialize carousel states
    document.querySelectorAll('.media-carousel').forEach((carousel) => {
        const groupId = carousel.dataset.groupId;
        carouselStates[groupId] = { currentIndex: 0 };
    });
}

// Setup filter buttons
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach((button) => {
        button.addEventListener('click', function () {
            // Update active state
            filterButtons.forEach((btn) => btn.classList.remove('active'));
            this.classList.add('active');

            // Filter media
            const filter = this.dataset.filter;
            filterMedia(filter);
        });
    });
}

// Setup lightbox
function setupLightbox() {
    const lightbox = document.getElementById('mediaLightbox');
    const closeBtn = document.getElementById('closeLightbox');
    const prevBtn = document.getElementById('prevMedia');
    const nextBtn = document.getElementById('nextMedia');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => navigateLightbox(-1));
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => navigateLightbox(1));
    }

    // Close on background click
    if (lightbox) {
        lightbox.addEventListener('click', function (e) {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
        if (lightbox && lightbox.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigateLightbox(-1);
            if (e.key === 'ArrowRight') navigateLightbox(1);
        }
    });
}

// Open media lightbox
function openMediaLightbox(index) {
    currentLightboxIndex = index;
    const item = filteredMedia[index];
    const lightbox = document.getElementById('mediaLightbox');
    const content = document.getElementById('lightboxContent');

    if (!item.items) return;

    // Handle multi-item carousel
    if (item.items.length > 1) {
        let carouselHtml = '<div class="lightbox-carousel-container">';
        carouselHtml += '<div class="lightbox-carousel-track" id="lightbox-track">';

        item.items.forEach((media, idx) => {
            carouselHtml += `<div class="lightbox-carousel-slide ${
                idx === 0 ? 'active' : ''
            }" data-index="${idx}">`;
            if (media.type === 'video') {
                carouselHtml += `<video src="${media.url}" controls></video>`;
            } else {
                carouselHtml += `<img src="${media.url}" alt="${escapeHtml(item.title || '')}" />`;
            }
            carouselHtml += '</div>';
        });

        carouselHtml += '</div>';

        // Add navigation arrows (only one set)
        carouselHtml += `
            <button class="lightbox-carousel-arrow prev" onclick="lightboxCarouselNav(-1)">‹</button>
            <button class="lightbox-carousel-arrow next" onclick="lightboxCarouselNav(1)">›</button>
        `;

        // Add dots indicator
        carouselHtml += '<div class="lightbox-carousel-dots">';
        item.items.forEach((_, i) => {
            carouselHtml += `<button class="lightbox-carousel-dot ${
                i === 0 ? 'active' : ''
            }" onclick="lightboxCarouselGoTo(${i})" data-index="${i}"></button>`;
        });
        carouselHtml += '</div>';
        carouselHtml += '</div>';

        content.innerHTML = carouselHtml;

        // Initialize lightbox carousel state
        window.lightboxCarouselIndex = 0;
        window.lightboxCarouselTotal = item.items.length;
    } else {
        // Single item
        const media = item.items[0];
        if (media.type === 'video') {
            content.innerHTML = `<video src="${media.url}" controls autoplay></video>`;
        } else {
            content.innerHTML = `<img src="${media.url}" alt="${escapeHtml(item.title || '')}" />`;
        }
    }

    // Add info if available
    if (item.title || item.description) {
        content.innerHTML += `
            <div class="lightbox-info">
                ${item.title ? `<h3>${escapeHtml(item.title)}</h3>` : ''}
                ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
            </div>
        `;
    }

    lightbox.classList.add('active');
}

// Lightbox carousel navigation
function lightboxCarouselNav(direction) {
    if (
        typeof window.lightboxCarouselIndex === 'undefined' ||
        typeof window.lightboxCarouselTotal === 'undefined'
    ) {
        return;
    }

    const newIndex = window.lightboxCarouselIndex + direction;

    if (newIndex >= 0 && newIndex < window.lightboxCarouselTotal) {
        lightboxCarouselGoTo(newIndex);
    } else if (newIndex < 0) {
        // Wrap to last
        lightboxCarouselGoTo(window.lightboxCarouselTotal - 1);
    } else {
        // Wrap to first
        lightboxCarouselGoTo(0);
    }
}

// Go to specific slide in lightbox
function lightboxCarouselGoTo(index) {
    window.lightboxCarouselIndex = index;

    // Update slide visibility
    const slides = document.querySelectorAll('.lightbox-carousel-slide');
    const dots = document.querySelectorAll('.lightbox-carousel-dot');

    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
        if (i === index) {
            slide.style.display = 'block';
            // Auto-play video if it's a video slide
            const video = slide.querySelector('video');
            if (video) {
                video.play().catch(() => {});
            }
        } else {
            slide.style.display = 'none';
            // Pause video if it's not active
            const video = slide.querySelector('video');
            if (video) {
                video.pause();
            }
        }
    });

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

// Carousel states
const carouselStates = {};

// Carousel navigation functions
function carouselNext(groupId) {
    const track = document.getElementById(`track-${groupId}`);
    const slides = track.children.length;
    const state = carouselStates[groupId] || { currentIndex: 0 };

    state.currentIndex = (state.currentIndex + 1) % slides;
    carouselStates[groupId] = state;
    updateCarousel(groupId);
}

function carouselPrev(groupId) {
    const track = document.getElementById(`track-${groupId}`);
    const slides = track.children.length;
    const state = carouselStates[groupId] || { currentIndex: 0 };

    state.currentIndex = (state.currentIndex - 1 + slides) % slides;
    carouselStates[groupId] = state;
    updateCarousel(groupId);
}

function carouselGoTo(groupId, index) {
    carouselStates[groupId] = { currentIndex: index };
    updateCarousel(groupId);
}

function updateCarousel(groupId) {
    const state = carouselStates[groupId];
    const track = document.getElementById(`track-${groupId}`);
    const dots = document.querySelectorAll(
        `.media-carousel[data-group-id="${groupId}"] .carousel-dot`
    );

    if (track) {
        track.style.transform = `translateX(-${state.currentIndex * 100}%)`;
    }

    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === state.currentIndex);
    });
}

// Open YouTube lightbox
function openYouTubeLightbox(embedUrl, title, description) {
    const lightbox = document.getElementById('mediaLightbox');
    const content = document.getElementById('lightboxContent');

    content.innerHTML = `
        <div style="position: relative; width: 80vw; max-width: 1200px; aspect-ratio: 16/9;">
            <iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: var(--radius-lg);" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
        ${
            title || description
                ? `
            <div class="lightbox-info">
                ${title ? `<h3>${title}</h3>` : ''}
                ${description ? `<p>${description}</p>` : ''}
            </div>
        `
                : ''
        }
    `;

    lightbox.classList.add('active');
}

// Open Facebook lightbox
function openFacebookLightbox(embedUrl, title, description) {
    const lightbox = document.getElementById('mediaLightbox');
    const content = document.getElementById('lightboxContent');

    content.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: var(--radius-lg); max-width: 600px;">
            <iframe src="${embedUrl}" width="500" height="600" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
        </div>
        ${
            title || description
                ? `
            <div class="lightbox-info">
                ${title ? `<h3>${title}</h3>` : ''}
                ${description ? `<p>${description}</p>` : ''}
            </div>
        `
                : ''
        }
    `;

    lightbox.classList.add('active');
}

// Navigate lightbox
function navigateLightbox(direction) {
    const newIndex = currentLightboxIndex + direction;
    if (newIndex >= 0 && newIndex < filteredMedia.length) {
        const item = filteredMedia[newIndex];
        if (item.linkType === 'youtube') {
            openYouTubeLightbox(item.embedUrl, item.title, item.description || '');
        } else if (item.linkType === 'facebook') {
            openFacebookLightbox(item.embedUrl, item.title, item.description || '');
        } else {
            openMediaLightbox(newIndex);
        }
    }
}

// Close lightbox
function closeLightbox() {
    const lightbox = document.getElementById('mediaLightbox');
    lightbox.classList.remove('active');
}

// Load more functionality
function updateLoadMoreButton() {
    const button = document.getElementById('loadMoreBtn');
    if (button) {
        if (filteredMedia.length > currentPage * itemsPerPage) {
            button.style.display = 'inline-flex';
            button.onclick = loadMore;
        } else {
            button.style.display = 'none';
        }
    }
}

function loadMore() {
    currentPage++;
    renderGallery();
    updateLoadMoreButton();
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

// Show error state
function showError() {
    const gallery = document.getElementById('mediaGallery');
    gallery.innerHTML =
        '<div class="loading-placeholder"><p>Error loading media. Please try again later.</p></div>';
}
