import { EXT_NAME } from "./constants.js";
import { state, disposers } from "./state.js";
import { isPlayableUri } from "./utils.js";
import { addToTargetPlaylist } from "./playlist.js";

const _redirectLibraryAddTokens = [];

export function withRedirectedLibraryAdd(fn) {
    const token = {};
    _redirectLibraryAddTokens.push(token);
    return Promise.resolve(fn()).finally(() => {
        const index = _redirectLibraryAddTokens.indexOf(token);
        if (index !== -1) _redirectLibraryAddTokens.splice(index, 1);
    });
}

// patch libraryapi.add so like actions are redirected while interception is active
export function patchLibraryAdd() {
    try {
        if (Spicetify.Platform?.LibraryAPI?.add) {
            state.originalLibraryAdd = Spicetify.Platform.LibraryAPI.add.bind(Spicetify.Platform.LibraryAPI);
            const redirectedLibraryAdd = async function (...args) {
                if (!state.targetPlaylistUri || _redirectLibraryAddTokens.length === 0) {
                    return state.originalLibraryAdd(...args);
                }

                // collect playable uris from the api arguments.
                const uris = [];
                const extractUris = (val) => {
                    if (!val) return;
                    if (typeof val === "string") {
                        if (isPlayableUri(val)) {
                            uris.push(val);
                        }
                    } else if (Array.isArray(val)) {
                        val.forEach(extractUris);
                    } else if (typeof val === "object") {
                        extractUris(val.uris);
                        extractUris(val.uri);
                        if (Array.isArray(val.items)) {
                            val.items.forEach(item => extractUris(item.uri || item));
                        }
                    }
                };
                args.forEach(extractUris);

                if (uris.length > 0) {
                    console.log(`[${EXT_NAME}] Intercepted and redirecting LibraryAPI.add for URIs:`, uris);
                    let allSuccess = true;
                    for (const uri of uris) {
                        const success = await addToTargetPlaylist(uri);
                        if (!success) allSuccess = false;
                    }
                    return allSuccess;
                }

                return state.originalLibraryAdd(...args);
            };
            Spicetify.Platform.LibraryAPI.add = redirectedLibraryAdd;
            disposers.push(() => {
                if (Spicetify.Platform?.LibraryAPI?.add === redirectedLibraryAdd) {
                    Spicetify.Platform.LibraryAPI.add = state.originalLibraryAdd;
                }
            });
        }
    } catch (patchErr) {
        // preserve the original api so event interception can handle the action.
        console.warn(`[${EXT_NAME}] Could not patch LibraryAPI.add:`, patchErr);
        state.originalLibraryAdd = Spicetify.Platform?.LibraryAPI?.add?.bind(Spicetify.Platform.LibraryAPI) ?? null;
    }
}
