import { EXT_NAME, DEBOUNCE_MS, VALIDITY_CACHE_TTL } from "./constants.js";
import { state, persist, resetValidityCache } from "./state.js";

const _recentAdds = new Map();
// determine whether the user can add tracks; Spotify exposes this as `canAdd`
export function isEditablePlaylist(item) {
    if (typeof item.canAdd === "boolean") return item.canAdd;
    if (typeof item.isOwnedBySelf === "boolean") return item.isOwnedBySelf;
    return true;
}
export async function isPlaylistInLibrary(uri) {
    if (!uri) return false;

    const now = Date.now();
    if (state.validityCache.uri === uri && (now - state.validityCache.ts) < VALIDITY_CACHE_TTL) {
        return state.validityCache.valid;
    }

    try {
        const rootlist = await Spicetify.Platform.RootlistAPI.getContents();
        if (!rootlist || !rootlist.items) {
            console.warn(`[${EXT_NAME}] Could not load rootlist, assuming playlist is valid.`);
            return true;
        }

        function findInItems(items) {
            for (const item of items) {
                if (item.type === "playlist" && item.uri === uri) {
                    if (!isEditablePlaylist(item)) {
                        return false;
                    }
                    return true;
                }
                if (item.type === "folder" && item.items) {
                    const result = findInItems(item.items);
                    if (result !== undefined) return result;
                }
            }
            return undefined;
        }

        const result = findInItems(rootlist.items);
        const valid = result === true;

        if (result === undefined) {
            console.warn(`[${EXT_NAME}] Playlist ${uri} not found in rootlist - deleted or unfollowed.`);
        }

        state.validityCache = { uri, valid, ts: Date.now() };
        return valid;
    } catch (err) {
        console.warn(`[${EXT_NAME}] Rootlist API error, assuming playlist valid:`, err);
        return true;
    }
}

export async function setTargetPlaylist(uri, successMessage = "Target playlist updated") {
    const valid = await isPlaylistInLibrary(uri);
    if (!valid) {
        Spicetify.showNotification("This playlist is read-only or no longer available", true);
        return false;
    }

    state.targetPlaylistUri = uri;
    persist();
    Spicetify.showNotification(successMessage);
    return true;
}


export async function addToTargetPlaylist(itemUri) {
    // Rate limit additions
    const now = Date.now();
    const recentKey = `${state.targetPlaylistUri || "liked"}|${itemUri}`;
    if (_recentAdds.has(recentKey) && (now - _recentAdds.get(recentKey)) < DEBOUNCE_MS) {
        return true;
    }
    _recentAdds.set(recentKey, now);


    if (_recentAdds.size > 50) {
        for (const [key, ts] of _recentAdds) {
            if (now - ts >= DEBOUNCE_MS) _recentAdds.delete(key);
        }
        if (_recentAdds.size > 50) {
            const keys = Array.from(_recentAdds.keys());
            const toRemove = keys.slice(0, _recentAdds.size - 50);
            for (const k of toRemove) {
                _recentAdds.delete(k);
            }
        }
    }

    if (!state.targetPlaylistUri) {
        return await addToLikedSongs(itemUri);
    }

    // (force bypass cache) check rootlist directly to prevent ghost-adds to deleted playlists
    let reallyExists = false;
    try {
        const freshRootlist = await Spicetify.Platform.RootlistAPI.getContents();
        const findUri = (items) => {
            for (const item of items) {
                if (item.uri === state.targetPlaylistUri) return true;
                if (item.items && findUri(item.items)) return true;
            }
            return false;
        };
        reallyExists = findUri(freshRootlist?.items || []);
    } catch (e) {
        // keep the existing target when the rootlist is unavailable; the write api remains authoritative.
        reallyExists = true;
    }

    if (!reallyExists) {
        _recentAdds.delete(recentKey);
        state.targetPlaylistUri = "";
        resetValidityCache();
        persist();

        // reset the target and fall back without showing a second notification.
        console.warn(`[${EXT_NAME}] Target playlist deleted. Resetting to Liked Songs.`);
        return await addToLikedSongs(itemUri);
    }

    try {
        const options = state.addToTop ? { before: "start" } : {};
        await Spicetify.Platform.PlaylistAPI.add(state.targetPlaylistUri, [itemUri], options);
        return true;
    } catch (err) {
        _recentAdds.delete(recentKey);
        console.error(`[${EXT_NAME}] Failed to add item:`, err);

        // if the API throws, it's likely deleted or we lost permissions
        state.targetPlaylistUri = "";
        resetValidityCache();
        persist();

        // the failure is logged above (console); fall back without showing a duplicate notification.
        console.warn(`[${EXT_NAME}] Target playlist unavailable. Resetting to Liked Songs.`);
        return await addToLikedSongs(itemUri);
    }
}

export async function addToLikedSongs(itemUri) {
    try {
        if (state.originalLibraryAdd) {
            await state.originalLibraryAdd({ uris: [itemUri] });
        } else if (Spicetify.CosmosAsync) {
            const id = itemUri.split(":").pop();
            const type = itemUri.split(":")[1] || "tracks";
            const url = type === "episode"
                ? "https://api.spotify.com/v1/me/episodes"
                : "https://api.spotify.com/v1/me/tracks";
            await Spicetify.CosmosAsync.put(url, { ids: [id] });
        }
        return true;
    } catch (err) {
        Spicetify.showNotification("Couldn't save to library, please try again!", true);
        console.error(`[${EXT_NAME}]`, err);
        return false;
    }
}
