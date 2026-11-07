// Redirect Likes - a Spicetify extension that redirects the "Like" button and "Add to Playlist" (+) to a target playlist.
// How to use: click your profile icon > "Redirect Likes Settings" or right-click any playlist to choose a target playlist.

import { EXT_NAME } from "./constants.js";
import { state, loadState } from "./state.js";
import { injectStyles } from "./ui/styles.js";
import { patchLibraryAdd } from "./library-patch.js";
import { installClickInterceptor } from "./click-handler.js";
import { registerMenuItems } from "./menu.js";
import { exposeApi } from "./api.js";

(async function RedirectLikes() {
    // avoid stacking listeners/menu items if Spicetify reloads the extension.
    if (globalThis.RedirectLikes?.dispose) {
        globalThis.RedirectLikes.dispose();
    }

    // spicetify loads async so we just poll until everything's ready
    while (
        typeof globalThis.Spicetify === "undefined" ||
        !globalThis.Spicetify?.showNotification ||
        !globalThis.Spicetify?.Platform?.PlaylistAPI ||
        !globalThis.Spicetify?.Player ||
        !globalThis.Spicetify?.LocalStorage ||
        !globalThis.Spicetify?.ContextMenu ||
        !globalThis.Spicetify?.Menu ||
        !globalThis.Spicetify?.PopupModal ||
        !globalThis.Spicetify?.Platform?.RootlistAPI
    ) {
        await new Promise(r => setTimeout(r, 500));
    }

    injectStyles();
    loadState();
    patchLibraryAdd();
    installClickInterceptor();
    registerMenuItems();
    exposeApi();

    if (!state.targetPlaylistUri) {
        console.log(`[${EXT_NAME}] Ready - No target playlist set, defaulting to Liked Songs.`);
    } else {
        console.log(`[${EXT_NAME}] Ready - Target playlist: ${state.targetPlaylistUri} | state.preventLike: ${state.preventLike}`);
    }
})();
