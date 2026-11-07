import { CONFIG_PLAYLIST_URI, CONFIG_PREVENT_LIKE, CONFIG_ADD_TO_TOP } from "./constants.js";

// Shared mutable state. Modules import this object and read/write its fields.
export const state = {
    targetPlaylistUri: "",
    preventLike: true,
    addToTop: false,
    validityCache: { uri: "", valid: false, ts: 0 },
    originalLibraryAdd: null,
};

// Cleanup callbacks, run in reverse order when the extension is reloaded
export const disposers = [];

// MUST BE CALLED AFTER Spicetify.LocalStorage is available
export function loadState() {
    state.targetPlaylistUri = Spicetify.LocalStorage.get(CONFIG_PLAYLIST_URI) ?? "";
    state.preventLike = Spicetify.LocalStorage.get(CONFIG_PREVENT_LIKE) !== "false";
    const rawTop = Spicetify.LocalStorage.get(CONFIG_ADD_TO_TOP);
    state.addToTop = rawTop === "true" || rawTop === true;
}

export function persist() {
    Spicetify.LocalStorage.set(CONFIG_PLAYLIST_URI, state.targetPlaylistUri);
    Spicetify.LocalStorage.set(CONFIG_PREVENT_LIKE, String(state.preventLike));
    Spicetify.LocalStorage.set(CONFIG_ADD_TO_TOP, String(state.addToTop));
}

export function resetValidityCache() {
    state.validityCache = { uri: "", valid: false, ts: 0 };
}
