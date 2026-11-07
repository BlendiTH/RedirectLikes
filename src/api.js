import { EXT_NAME } from "./constants.js";
import { state, persist, resetValidityCache, disposers } from "./state.js";
import { normalizePlaylistUri } from "./utils.js";
import { setTargetPlaylist } from "./playlist.js";

// expose the configuration api through window.redirectlikes.
export function exposeApi() {
    window.RedirectLikes = {
        async configure() {
            const raw = prompt(
                [
                    "Paste the target playlist URL or URI.",
                    "",
                    "  URL example : https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
                    "  URI example : spotify:playlist:37i9dQZF1DXcBWIGoYBM5M",
                ].join("\n")
            );
            if (!raw) return;
            const uri = normalizePlaylistUri(raw);
            if (!uri) {
                Spicetify.showNotification("That doesn't look like a valid playlist link", true);
                return;
            }
            await setTargetPlaylist(uri, "Target playlist saved");
        },

        setPreventLike(value) {
            state.preventLike = Boolean(value);
            persist();
            Spicetify.showNotification(
                `Liked Songs saving ${state.preventLike ? "disabled" : "enabled"}`
            );
        },

        clearTarget() {
            state.targetPlaylistUri = "";
            resetValidityCache();
            persist();
            Spicetify.showNotification("Playlist reset!");
        },

        status() {
            console.group(`[${EXT_NAME}] Current config`);
            console.log("Target playlist URI :", state.targetPlaylistUri || "(not set, using Liked Songs)");
            console.log("Block Liked Songs   :", state.preventLike);
            console.log("Add to top          :", state.addToTop);
            console.groupEnd();
        },

        dispose() {
            while (disposers.length) {
                const dispose = disposers.pop();
                try {
                    dispose();
                } catch (err) {
                    console.warn(`[${EXT_NAME}] Cleanup failed:`, err);
                }
            }
        },
    };
}
