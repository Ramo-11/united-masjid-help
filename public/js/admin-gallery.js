// Admin Gallery Management
let selectedFile = null;

document.addEventListener('DOMContentLoaded', function () {
    setupFileUpload();
    loadAdminGallery();
});

function setupFileUpload() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('media-file');
    const previewArea = document.getElementById('preview-area');
    const previewContainer = document.getElementById('preview-container');

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

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

function handleFileSelect(file) {
    // Validate file type
    const validTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
    ];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image (JPEG, PNG, GIF, WEBP) or video (MP4, MOV) file.');
        return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File size must be less than 50MB.');
        return;
    }

    selectedFile = file;

    // Show preview
    const previewArea = document.getElementById('preview-area');
    const previewContainer = document.getElementById('preview-container');

    previewArea.classList.add('active');

    const reader = new FileReader();
    reader.onload = function (e) {
        if (file.type.startsWith('video/')) {
            previewContainer.innerHTML = `
                <video src="${e.target.result}" controls style="width: 100%;"></video>
                <button class="remove-preview" onclick="removePreview()">×</button>
            `;
        } else {
            previewContainer.innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="width: 100%;">
                <button class="remove-preview" onclick="removePreview()">×</button>
            `;
        }
    };
    reader.readAsDataURL(file);
}

function removePreview() {
    selectedFile = null;
    document.getElementById('preview-area').classList.remove('active');
    document.getElementById('media-file').value = '';
}

async function uploadMedia(e) {
    e.preventDefault();

    if (!selectedFile) {
        alert('Please select a file to upload.');
        return;
    }

    const title = document.getElementById('media-title').value.trim();
    const description = document.getElementById('media-description').value.trim();

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('password', adminPassword);

    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill-upload');
    const uploadBtn = document.querySelector('#upload-media-form button[type="submit"]');

    uploadProgress.classList.add('active');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    // Simulate progress (since we can't track actual upload progress with fetch)
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
        const media = await response.json();

        const galleryList = document.getElementById('admin-gallery-list');

        if (media.length === 0) {
            galleryList.innerHTML = '<p class="no-data">No media uploaded yet.</p>';
            return;
        }

        let html = '';
        media.forEach((item) => {
            const date = new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });

            html += `
        <div class="gallery-item-admin">
            <div class="media-container">
                ${
                    item.type === 'video'
                        ? `<video src="${item.url}" controls></video>`
                        : `<img src="${item.url}" alt="${item.title || 'Gallery image'}" />`
                }
            </div>
            ${item.title ? `<h4>${item.title}</h4>` : '<h4>Untitled</h4>'}
            ${item.description ? `<p>${item.description}</p>` : ''}
            <p style="font-size: 0.85rem; color: #999; margin-top: 0.5rem;">
                ${item.type === 'video' ? '▶ Video' : '📷 Photo'} • Uploaded ${date}
            </p>
            <button class="delete-btn" onclick="deleteMedia(${item.id}, '${
                item.title || 'this media'
            }')">
                Delete
            </button>
        </div>
    `;
        });

        galleryList.innerHTML = html;
    } catch (error) {
        console.error('Error loading gallery:', error);
    }
}

async function deleteMedia(mediaId, mediaTitle) {
    if (!confirm(`Are you sure you want to delete "${mediaTitle}"? This cannot be undone!`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/media/${mediaId}`, {
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
