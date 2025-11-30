// Admin Gallery Management
let selectedFiles = [];

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    setupFileUpload();
    loadAdminGallery();
    loadExternalLinks();

    // Event Delegation for Edit Buttons
    // This is the industry standard way to handle events for dynamically created elements
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('edit-media-btn')) {
            const btn = e.target;
            const groupId = btn.dataset.groupId;
            const title = btn.dataset.title;
            const description = btn.dataset.description;

            openEditModal(groupId, title, description);
        }
    });
});

function setupFileUpload() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('media-file');

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(Array.from(e.target.files));
        }
    });
}

function handleFileSelect(files) {
    const validTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
    ];

    const maxSize = 50 * 1024 * 1024;

    for (let file of files) {
        if (!validTypes.includes(file.type)) {
            alert(
                `${file.name}: Please select a valid image (JPEG, PNG, GIF, WEBP) or video (MP4, MOV) file.`
            );
            continue;
        }

        if (file.size > maxSize) {
            alert(`${file.name}: File size must be less than 50MB.`);
            continue;
        }

        selectedFiles.push(file);
    }

    if (selectedFiles.length === 0) return;

    // Show preview
    const previewArea = document.getElementById('preview-area');
    const previewContainer = document.getElementById('preview-container');

    previewArea.classList.add('active');
    previewContainer.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';

            if (file.type.startsWith('video/')) {
                previewItem.innerHTML = `
                    <video src="${e.target.result}" controls></video>
                    <button class="remove-preview-item" onclick="removeIndividualPreview(${index})">×</button>
                `;
            } else {
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button class="remove-preview-item" onclick="removeIndividualPreview(${index})">×</button>
                `;
            }

            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function removeIndividualPreview(index) {
    selectedFiles.splice(index, 1);

    if (selectedFiles.length === 0) {
        removePreview();
    } else {
        handleFileSelect([]); // Clear and re-render logic handled by just resetting input for now
        // But better logic is to reconstruct FileList, which is hard in JS.
        // Simple hack: Re-render preview from selectedFiles array

        // Clear UI first
        const previewContainer = document.getElementById('preview-container');
        previewContainer.innerHTML = '';

        // Re-render
        selectedFiles.forEach((file, idx) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';

                // Copy-paste render logic from above or extract to function
                if (file.type.startsWith('video/')) {
                    previewItem.innerHTML = `
                        <video src="${e.target.result}" controls></video>
                        <button class="remove-preview-item" onclick="removeIndividualPreview(${idx})">×</button>
                    `;
                } else {
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button class="remove-preview-item" onclick="removeIndividualPreview(${idx})">×</button>
                    `;
                }
                previewContainer.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    }
}

function removePreview() {
    selectedFiles = [];
    document.getElementById('preview-area').classList.remove('active');
    document.getElementById('media-file').value = '';
    document.getElementById('preview-container').innerHTML = '';
}

async function uploadMedia(e) {
    e.preventDefault();

    if (selectedFiles.length === 0) {
        alert('Please select at least one file to upload.');
        return;
    }

    const title = document.getElementById('media-title').value.trim();
    const description = document.getElementById('media-description').value.trim();

    const formData = new FormData();
    selectedFiles.forEach((file) => {
        formData.append('files', file);
    });
    formData.append('title', title);
    formData.append('description', description);
    formData.append('password', adminPassword); // Assumes adminPassword is global from admin-dashboard.js

    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill-upload');
    const uploadBtn = document.querySelector('#upload-media-form button[type="submit"]');

    uploadProgress.classList.add('active');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 5;
        if (progress >= 90) {
            clearInterval(progressInterval);
        }
        progressFill.style.width = progress + '%';
        progressFill.textContent = progress + '%';
    }, 200);

    try {
        const response = await fetch('/api/admin/media', {
            method: 'POST',
            body: formData,
        });

        clearInterval(progressInterval);
        progressFill.style.width = '100%';
        progressFill.textContent = '100%';

        if (response.ok) {
            setTimeout(() => {
                alert('Media uploaded successfully!');
                document.getElementById('upload-media-form').reset();
                removePreview();
                uploadProgress.classList.remove('active');
                progressFill.style.width = '0%';
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Media';
                loadAdminGallery();
            }, 500);
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        clearInterval(progressInterval);
        console.error('Upload error:', error);
        alert('Error uploading media. Please try again.');
        uploadProgress.classList.remove('active');
        progressFill.style.width = '0%';
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Media';
    }
}

async function loadAdminGallery() {
    try {
        const response = await fetch('/api/media');
        const mediaGroups = await response.json();

        const galleryList = document.getElementById('admin-gallery-list');

        if (mediaGroups.length === 0) {
            galleryList.innerHTML = '<p class="no-data">No media uploaded yet.</p>';
            return;
        }

        let html = '';
        mediaGroups.forEach((group) => {
            const date = new Date(group.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });

            const firstItem = group.items[0];
            const mediaCount = group.items.length;

            // Use data attributes to store values safely
            // escapeHtml ensures that quotes inside the title/description don't break the HTML attribute
            html += `
        <div class="gallery-item-admin">
            <div class="media-container">
                ${
                    firstItem.type === 'video'
                        ? `<video src="${firstItem.url}" controls></video>`
                        : `<img src="${firstItem.url}" alt="${escapeHtml(
                              group.title || 'Gallery image'
                          )}" />`
                }
                ${mediaCount > 1 ? `<div class="media-count-badge">${mediaCount} items</div>` : ''}
            </div>
            <div class="media-info-admin">
                ${group.title ? `<h4>${escapeHtml(group.title)}</h4>` : '<h4>Untitled</h4>'}
                ${group.description ? `<p>${escapeHtml(group.description)}</p>` : ''}
                <p class="media-meta">
                    ${firstItem.type === 'video' ? '▶ Video' : '📷 Photo'}${
                mediaCount > 1 ? ` +${mediaCount - 1} more` : ''
            } • Uploaded ${date}
                </p>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary edit-media-btn" 
                        data-group-id="${group.group_id}"
                        data-title="${escapeHtml(group.title || '')}"
                        data-description="${escapeHtml(group.description || '')}">
                        Edit Details
                    </button>
                    <button class="delete-btn" onclick="deleteMediaGroup('${group.group_id}', '${
                escapeHtml(group.title || 'this media group').replace(/'/g, "\\'")
                /* Note: Delete still uses inline JS for simplicity, but we escape single quotes explicitly for the confirm dialog */
            }')">
                        Delete ${mediaCount > 1 ? 'Group' : ''}
                    </button>
                </div>
            </div>
        </div>
    `;
        });

        galleryList.innerHTML = html;
    } catch (error) {
        console.error('Error loading gallery:', error);
    }
}

async function deleteMediaGroup(groupId, mediaTitle) {
    if (!confirm(`Are you sure you want to delete "${mediaTitle}"? This cannot be undone!`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/media/group/${groupId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: adminPassword }),
        });

        if (response.ok) {
            alert('Media deleted successfully.');
            loadAdminGallery();
        } else {
            alert('Error deleting media.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting media.');
    }
}

async function addExternalLink(e) {
    e.preventDefault();

    const url = document.getElementById('link-url').value.trim();
    const title = document.getElementById('link-title').value.trim();
    const description = document.getElementById('link-description').value.trim();
    const type = document.getElementById('link-type').value;

    try {
        const response = await fetch('/api/admin/external-links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, title, description, type, password: adminPassword }),
        });

        if (response.ok) {
            alert('Link added successfully!');
            document.getElementById('add-link-form').reset();
            loadExternalLinks();
        } else {
            alert('Error adding link.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding link.');
    }
}

async function loadExternalLinks() {
    try {
        const response = await fetch('/api/external-links');
        const links = await response.json();

        const linksList = document.getElementById('admin-links-list');

        if (links.length === 0) {
            linksList.innerHTML = '<p class="no-data">No external links added yet.</p>';
            return;
        }

        let html = '';
        links.forEach((link) => {
            const date = new Date(link.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });

            const typeIcons = {
                youtube: '▶️',
                facebook: '👍',
                article: '📄',
                other: '🔗',
            };

            html += `
        <div class="gallery-item-admin">
            <div class="media-info-admin">
                <h4>${escapeHtml(link.title)}</h4>
                ${link.description ? `<p>${escapeHtml(link.description)}</p>` : ''}
                <p style="font-size: 0.9rem; color: #667eea; word-break: break-all; margin-top: 0.5rem;">
                    <a href="${link.url}" target="_blank" rel="noopener">${escapeHtml(link.url)}</a>
                </p>
                <p class="media-meta">
                    ${typeIcons[link.type] || '🔗'} ${
                link.type.charAt(0).toUpperCase() + link.type.slice(1)
            } • Added ${date}
                </p>
                <button class="delete-btn" onclick="deleteExternalLink(${link.id}, '${escapeHtml(
                link.title
            ).replace(/'/g, "\\'")}')">
                    Delete
                </button>
            </div>
        </div>
    `;
        });

        linksList.innerHTML = html;
    } catch (error) {
        console.error('Error loading links:', error);
    }
}

async function deleteExternalLink(linkId, linkTitle) {
    if (!confirm(`Are you sure you want to delete "${linkTitle}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/external-links/${linkId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: adminPassword }),
        });

        if (response.ok) {
            alert('Link deleted successfully.');
            loadExternalLinks();
        } else {
            alert('Error deleting link.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting link.');
    }
}

function openEditModal(groupId, currentTitle, currentDescription) {
    const modal = document.createElement('div');
    modal.className = 'edit-modal';

    // Note: escapeHtml is used here on values to prevent HTML injection into input values
    modal.innerHTML = `
        <div class="edit-modal-content">
            <div class="edit-modal-header">
                <h3>Edit Media Details</h3>
                <button class="edit-modal-close" onclick="closeEditModal()">&times;</button>
            </div>
            <form id="edit-media-form" onsubmit="saveMediaEdit(event, '${groupId}')">
                <div class="form-group">
                    <label for="edit-title">Title</label>
                    <input type="text" id="edit-title" value="${escapeHtml(
                        currentTitle || ''
                    )}" placeholder="Enter title" />
                </div>
                <div class="form-group">
                    <label for="edit-description">Description</label>
                    <textarea id="edit-description" rows="3" placeholder="Enter description">${escapeHtml(
                        currentDescription || ''
                    )}</textarea>
                </div>
                <div class="edit-modal-actions">
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" onclick="closeEditModal()" class="btn btn-secondary">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeEditModal() {
    const modal = document.querySelector('.edit-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

async function saveMediaEdit(event, groupId) {
    event.preventDefault();

    const title = document.getElementById('edit-title').value.trim();
    const description = document.getElementById('edit-description').value.trim();

    try {
        const response = await fetch(`/api/admin/media/${groupId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword, title, description }),
        });

        if (response.ok) {
            alert('Media updated successfully!');
            closeEditModal();
            loadAdminGallery();
        } else {
            alert('Error updating media.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating media.');
    }
}

// Utility to safely escape HTML to prevent XSS and attribute breaking
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
