// Admin Gallery Management
let selectedFiles = [];

document.addEventListener('DOMContentLoaded', function () {
    setupFileUpload();
    loadAdminGallery();
});

function setupFileUpload() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('media-file');
    const previewArea = document.getElementById('preview-area');

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
        handleFileSelect([]);
        const fileInput = document.getElementById('media-file');
        const dt = new DataTransfer();
        selectedFiles.forEach((file) => dt.items.add(file));
        fileInput.files = dt.files;
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
    formData.append('password', adminPassword);

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

            html += `
        <div class="gallery-item-admin">
            <div class="media-container">
                ${
                    firstItem.type === 'video'
                        ? `<video src="${firstItem.url}" controls></video>`
                        : `<img src="${firstItem.url}" alt="${group.title || 'Gallery image'}" />`
                }
                ${mediaCount > 1 ? `<div class="media-count-badge">${mediaCount} items</div>` : ''}
            </div>
            <div class="media-info-admin">
                ${group.title ? `<h4>${group.title}</h4>` : '<h4>Untitled</h4>'}
                ${group.description ? `<p>${group.description}</p>` : ''}
                <p class="media-meta">
                    ${firstItem.type === 'video' ? '▶ Video' : '📷 Photo'}${
                mediaCount > 1 ? ` +${mediaCount - 1} more` : ''
            } • Uploaded ${date}
                </p>
                <button class="delete-btn" onclick="deleteMediaGroup('${group.group_id}', '${
                group.title || 'this media group'
            }')">
                    Delete ${mediaCount > 1 ? 'Group' : ''}
                </button>
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
