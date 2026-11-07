export function isPlayableUri(uri) {
    return typeof uri === "string" &&
        (uri.startsWith("spotify:track:") || uri.startsWith("spotify:episode:") || uri.startsWith("spotify:local:"));
}

// escape string for HTML
export function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// parse and normalize URIs
export function normalizePlaylistUri(raw) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    const urlMatch = trimmed.match(/open\.spotify\.com\/playlist\/([A-Za-z0-9]{22})(?:[\/?#]|$)/);
    if (urlMatch) return `spotify:playlist:${urlMatch[1]}`;
    if (/^spotify:playlist:[A-Za-z0-9]{22}$/.test(trimmed)) return trimmed;
    return null;
}
