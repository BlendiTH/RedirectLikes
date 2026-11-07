export const EXT_NAME = "RedirectLikes";
export const CONFIG_PLAYLIST_URI = `${EXT_NAME}:playlistUri`;
export const CONFIG_PREVENT_LIKE = `${EXT_NAME}:preventLike`;
export const CONFIG_ADD_TO_TOP = `${EXT_NAME}:addToTop`;

// suppress duplicate adds for the same item and target within this interval.
export const DEBOUNCE_MS = 5000;
// how long a "this playlist exists and is writable" check stays cached
export const VALIDITY_CACHE_TTL = 30000;

// selectors for the player bar and now-playing widgets in spotify's dom.
export const NOW_PLAYING_SELECTOR = [
    ".now-playing-bar",
    "[data-testid='now-playing-bar']",
    ".main-nowPlayingBar-container",
    ".main-nowPlayingWidget-nowPlaying",
    "[data-testid='now-playing-widget']",
    "[data-testid='now-playing-view']",
    "[data-testid='CoverSlotExpanded__container']",
    ".main-nowPlayingBar-left",
    ".main-nowPlayingBar-right",
    ".Root__now-playing-bar",
].join(", ");
