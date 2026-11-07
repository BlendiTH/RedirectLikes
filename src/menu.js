import { EXT_NAME } from "./constants.js";
import { state, persist, resetValidityCache, disposers } from "./state.js";
import { isPlayableUri } from "./utils.js";
import { isPlaylistInLibrary, setTargetPlaylist, addToTargetPlaylist } from "./playlist.js";
import { showPlaylistPicker } from "./ui/picker.js";
import { menuIcon, targetIcon, addIcon, resetIcon } from "./ui/icons.js";

function registerItem(item, label = item?.name ?? "unnamed item") {
    try {
        const registered = item.register();
        const disposable = registered ?? item;
        const unregister = disposable.deregister ?? disposable.unregister ?? disposable.remove;
        if (typeof unregister === "function") {
            disposers.push(() => unregister.call(disposable));
        }
        console.log(`[${EXT_NAME}] Registered: ${label}`);
    } catch (err) {
        // isolate registration failures so api changes do not prevent later menu items from being registered.
        console.error(`[${EXT_NAME}] Failed to register "${label}":`, err);
    }
}

export function registerMenuItems() {
    registerItem(new Spicetify.Menu.Item("Redirect Likes Settings", false, showPlaylistPicker, menuIcon));

    registerItem(new Spicetify.ContextMenu.Item(
        "Set as Redirect Likes target",
        async (uris) => {
            const uri = uris?.[0];
            const match = uri?.match(/playlist[:\/]([A-Za-z0-9]{22})/);
            if (!match) {
                Spicetify.showNotification("Right-click a playlist to set it as your target", true);
                return;
            }
            const normalizedUri = `spotify:playlist:${match[1]}`;

            const valid = await isPlaylistInLibrary(normalizedUri);
            if (!valid) {
                Spicetify.showNotification("This playlist is read-only or no longer available", true);
                return;
            }

            await setTargetPlaylist(normalizedUri, "Target playlist updated");
        },
        (uris) => {
            const uri = uris?.[0] ?? "";
            return uri.startsWith("spotify:playlist:") && !uri.includes("37i9dQZF");
        },
        targetIcon
    ));

    registerItem(new Spicetify.ContextMenu.Item(
        "Redirect Likes to target playlist",
        async (uris) => {
            const uri = uris?.[0];
            if (!isPlayableUri(uri)) {
                Spicetify.showNotification("This only works on tracks or playable items", true);
                return;
            }
            await addToTargetPlaylist(uri);
        },
        (uris) => {
            const uri = uris?.[0];
            return isPlayableUri(uri);
        },
        addIcon
    ));

    registerItem(new Spicetify.ContextMenu.Item(
        "Reset Redirect Likes to Liked Songs",
        () => {
            state.targetPlaylistUri = "";
            resetValidityCache();
            persist();
            Spicetify.showNotification("Playlist reset!");
        },
        (uris) => {
            const uri = uris?.[0] ?? "";
            return !!state.targetPlaylistUri && uri.startsWith("spotify:playlist:") && !uri.includes("37i9dQZF");
        },
        resetIcon
    ));
}
