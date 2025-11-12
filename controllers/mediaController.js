const Database = require('better-sqlite3');
const cloudinary = require('cloudinary').v2;
const dbPath = process.env.NODE_ENV === 'production' ? '/data/pantry.db' : 'pantry.db';
const db = new Database(dbPath);

// Get all media
exports.getAllMedia = (req, res) => {
    const media = db.prepare('SELECT * FROM media_gallery ORDER BY created_at DESC').all();

    // Group media by group_id
    const grouped = {};
    media.forEach((item) => {
        if (!grouped[item.group_id]) {
            grouped[item.group_id] = {
                group_id: item.group_id,
                title: item.title,
                description: item.description,
                created_at: item.created_at,
                items: [],
            };
        }
        grouped[item.group_id].items.push({
            id: item.id,
            url: item.url,
            thumbnail_url: item.thumbnail_url,
            type: item.type,
        });
    });

    res.json(Object.values(grouped));
};

// Upload media (admin)
exports.uploadMedia = async (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
    }

    try {
        const groupId = Date.now().toString();
        const uploadedMedia = [];

        for (const file of req.files) {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'auto',
                        folder: 'food-pantry',
                        transformation: file.mimetype.startsWith('video/')
                            ? [{ quality: 'auto' }]
                            : [{ quality: 'auto', fetch_format: 'auto' }],
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(file.buffer);
            });

            const mediaType = result.resource_type === 'video' ? 'video' : 'image';
            const thumbnailUrl =
                mediaType === 'video' ? result.url.replace(/\.[^.]+$/, '.jpg') : null;

            const stmt = db.prepare(`
                INSERT INTO media_gallery (cloudinary_id, url, thumbnail_url, type, title, description, group_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                result.public_id,
                result.secure_url,
                thumbnailUrl,
                mediaType,
                req.body.title || '',
                req.body.description || '',
                groupId
            );

            uploadedMedia.push({ url: result.secure_url, type: mediaType });
        }

        res.json({ success: true, media: uploadedMedia });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
};

// Delete media (admin)
exports.deleteMediaGroup = async (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { groupId } = req.params;

    try {
        const mediaItems = db
            .prepare('SELECT * FROM media_gallery WHERE group_id = ?')
            .all(groupId);

        if (mediaItems.length === 0) {
            return res.status(404).json({ error: 'Media not found' });
        }

        for (const media of mediaItems) {
            await cloudinary.uploader.destroy(media.cloudinary_id, {
                resource_type: media.type === 'video' ? 'video' : 'image',
            });
        }

        db.prepare('DELETE FROM media_gallery WHERE group_id = ?').run(groupId);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
};

// Get all external links
exports.getAllExternalLinks = (req, res) => {
    const links = db.prepare('SELECT * FROM external_links ORDER BY created_at DESC').all();

    const enrichedLinks = links.map((link) => {
        if (link.type === 'youtube') {
            return {
                ...link,
                embedUrl: getYouTubeEmbedUrl(link.url),
                thumbnail: getYouTubeThumbnail(link.url),
            };
        } else if (link.type === 'facebook') {
            return {
                ...link,
                embedUrl: getFacebookEmbedUrl(link.url),
            };
        }
        return link;
    });

    res.json(enrichedLinks);
};

// Add external link (admin)
exports.addExternalLink = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url, title, description, type } = req.body;

    const stmt = db.prepare(`
        INSERT INTO external_links (url, title, description, type)
        VALUES (?, ?, ?, ?)
    `);

    stmt.run(url, title, description || '', type);

    res.json({ success: true });
};

// Delete external link (admin)
exports.deleteExternalLink = (req, res) => {
    if (!req.body.password || req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    db.prepare('DELETE FROM external_links WHERE id = ?').run(id);

    res.json({ success: true });
};

// Helper functions
function getYouTubeEmbedUrl(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

function getYouTubeThumbnail(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
        ? `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`
        : null;
}

function getFacebookEmbedUrl(url) {
    return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(
        url
    )}&width=500&show_text=true`;
}
