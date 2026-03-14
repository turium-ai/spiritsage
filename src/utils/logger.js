const getApiUrl = (endpoint) => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseUrl = isLocal ? '' : 'https://spiritsage-backend-447843351231.us-central1.run.app';
    return `${baseUrl}${endpoint}`;
};

export const logRemoteEvent = async (type, message, details = {}) => {
    try {
        await fetch(getApiUrl('/api/admin/log-event'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, message, details, timestamp: new Date().toISOString() })
        });
    } catch (err) {
        console.error('Failed to log remote event:', err);
    }
};

export const logImageError = (itemName, imageUrl) => {
    logRemoteEvent('ERROR', `Image failed to load: ${itemName}`, {
        item: itemName,
        url: imageUrl,
        context: 'Recommendations Grid'
    });
};
