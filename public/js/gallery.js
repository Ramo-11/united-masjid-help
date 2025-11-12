// Public Gallery Display
let carouselStates = {};

async function loadMediaGallery() {
    try {
        const response = await fetch('/api/media');
        const mediaGroups = await response.json();

        const gallery = document.getElementById('media-gallery');

        if (mediaGroups.length === 0) {
            gallery.innerHTML = '<div class="no-media"><p>No media available yet.</p></div>';
            return;
        }

        let html = '';
        mediaGroups.forEach((group) => {
            const hasMultiple = group.items.length > 1;

            html += `
                <div class="media-item" onclick="openLightbox('${group.group_id}')">
                    ${
                        hasMultiple
                            ? `
                        <div class="media-carousel" id="carousel-${group.group_id}">
                            <div class="carousel-track" id="track-${group.group_id}">
                                ${group.items
                                    .map(
                                        (item, index) => `
                                    <div class="carousel-slide">
                                        ${
                                            item.type === 'video'
                                                ? `<video src="${item.url}"></video>
                                               <div class="play-overlay"></div>`
                                                : `<img src="${item.url}" alt="${
                                                      group.title || 'Gallery image'
                                                  }" />`
                                        }
                                    </div>
                                `
                                    )
                                    .join('')}
                            </div>
                            <button class="carousel-arrow prev" onclick="event.stopPropagation(); prevSlide('${
                                group.group_id
                            }')">‹</button>
                            <button class="carousel-arrow next" onclick="event.stopPropagation(); nextSlide('${
                                group.group_id
                            }')">›</button>
                            <div class="carousel-dots">
                                ${group.items
                                    .map(
                                        (_, index) => `
                                    <button class="carousel-dot ${
                                        index === 0 ? 'active' : ''
                                    }" onclick="event.stopPropagation(); goToSlide('${
                                            group.group_id
                                        }', ${index})"></button>
                                `
                                    )
                                    .join('')}
                            </div>
                        </div>
                    `
                            : `
                        <div class="media-container">
                            ${
                                group.items[0].type === 'video'
                                    ? `<video src="${group.items[0].url}"></video>
                                   <div class="play-overlay"></div>`
                                    : `<img src="${group.items[0].url}" alt="${
                                          group.title || 'Gallery image'
                                      }" />`
                            }
                        </div>
                    `
                    }
                    <span class="media-type-badge">${
                        group.items[0].type === 'video' ? 'Video' : 'Photo'
                    }${hasMultiple ? ` (${group.items.length})` : ''}</span>
                    ${
                        group.title || group.description
                            ? `
                        <div class="media-info">
                            ${group.title ? `<h3>${group.title}</h3>` : ''}
                            ${group.description ? `<p>${group.description}</p>` : ''}
                        </div>
                    `
                            : ''
                    }
                </div>
            `;

            if (hasMultiple) {
                carouselStates[group.group_id] = {
                    currentIndex: 0,
                    totalSlides: group.items.length,
                };
            }
        });

        gallery.innerHTML = html;
    } catch (error) {
        console.error('Error loading gallery:', error);
    }
}

function nextSlide(groupId) {
    const state = carouselStates[groupId];
    state.currentIndex = (state.currentIndex + 1) % state.totalSlides;
    updateCarousel(groupId);
}

function prevSlide(groupId) {
    const state = carouselStates[groupId];
    state.currentIndex = (state.currentIndex - 1 + state.totalSlides) % state.totalSlides;
    updateCarousel(groupId);
}

function goToSlide(groupId, index) {
    carouselStates[groupId].currentIndex = index;
    updateCarousel(groupId);
}

function updateCarousel(groupId) {
    const state = carouselStates[groupId];
    const track = document.getElementById(`track-${groupId}`);
    const dots = document.querySelectorAll(`#carousel-${groupId} .carousel-dot`);

    track.style.transform = `translateX(-${state.currentIndex * 100}%)`;

    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === state.currentIndex);
    });
}

let currentLightboxGroup = null;
let currentLightboxIndex = 0;

async function openLightbox(groupId) {
    try {
        const response = await fetch('/api/media');
        const mediaGroups = await response.json();
        const group = mediaGroups.find((g) => g.group_id === groupId);

        if (!group) return;

        currentLightboxGroup = group;
        currentLightboxIndex = 0;

        showLightboxSlide(0);

        const modal = document.getElementById('lightbox-modal');
        modal.classList.add('active');
    } catch (error) {
        console.error('Error opening lightbox:', error);
    }
}

function showLightboxSlide(index) {
    const group = currentLightboxGroup;
    const item = group.items[index];
    const content = document.getElementById('lightbox-media-content');

    const hasMultiple = group.items.length > 1;

    content.innerHTML = `
        ${
            item.type === 'video'
                ? `<video src="${item.url}" controls autoplay style="max-width: 100%; max-height: 85vh; border-radius: 10px;"></video>`
                : `<img src="${item.url}" alt="${
                      group.title || 'Gallery image'
                  }" style="max-width: 100%; max-height: 85vh; border-radius: 10px;" />`
        }
        ${
            hasMultiple
                ? `
            <button class="carousel-arrow prev" style="position: absolute; top: 50%; left: -60px;" onclick="lightboxPrevSlide()">‹</button>
            <button class="carousel-arrow next" style="position: absolute; top: 50%; right: -60px;" onclick="lightboxNextSlide()">›</button>
            <div class="carousel-dots" style="position: absolute; bottom: -40px; left: 50%; transform: translateX(-50%);">
                ${group.items
                    .map(
                        (_, i) => `
                    <button class="carousel-dot ${
                        i === index ? 'active' : ''
                    }" onclick="showLightboxSlide(${i})"></button>
                `
                    )
                    .join('')}
            </div>
        `
                : ''
        }
        ${
            group.title || group.description
                ? `
            <div class="lightbox-info">
                ${group.title ? `<h3>${group.title}</h3>` : ''}
                ${group.description ? `<p>${group.description}</p>` : ''}
            </div>
        `
                : ''
        }
    `;

    currentLightboxIndex = index;
}

function lightboxNextSlide() {
    const nextIndex = (currentLightboxIndex + 1) % currentLightboxGroup.items.length;
    showLightboxSlide(nextIndex);
}

function lightboxPrevSlide() {
    const prevIndex =
        (currentLightboxIndex - 1 + currentLightboxGroup.items.length) %
        currentLightboxGroup.items.length;
    showLightboxSlide(prevIndex);
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    modal.classList.remove('active');
    currentLightboxGroup = null;
    currentLightboxIndex = 0;
}

document.addEventListener('DOMContentLoaded', loadMediaGallery);

document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('lightbox-modal');
    if (!modal.classList.contains('active')) return;

    if (e.key === 'Escape') {
        closeLightbox();
    } else if (
        e.key === 'ArrowRight' &&
        currentLightboxGroup &&
        currentLightboxGroup.items.length > 1
    ) {
        lightboxNextSlide();
    } else if (
        e.key === 'ArrowLeft' &&
        currentLightboxGroup &&
        currentLightboxGroup.items.length > 1
    ) {
        lightboxPrevSlide();
    }
});

document.getElementById('lightbox-modal').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox-modal') {
        closeLightbox();
    }
});
