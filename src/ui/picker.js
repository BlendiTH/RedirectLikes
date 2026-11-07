import { EXT_NAME } from "../constants.js";
import { state, persist, resetValidityCache } from "../state.js";
import { escapeHtml, normalizePlaylistUri } from "../utils.js";
import { setTargetPlaylist, isEditablePlaylist } from "../playlist.js";
import { showConfirmation } from "./confirm.js";

export async function showPlaylistPicker() {
    try {
        const rootlist = await Spicetify.Platform.RootlistAPI.getContents();
        const playlists = [];

        function extractPlaylists(items) {
            for (const item of items) {
                if (item.type === "playlist") {
                    const uri = item.uri ?? "";
                    if (!uri.startsWith("spotify:playlist:") || uri.includes("37i9dQZF")) continue;
                    if (!isEditablePlaylist(item)) continue;
                    if (item.owner?.username === "spotify" || item.owner?.uri?.includes("spotify:user:spotify") || item.owner?.name === "Spotify") continue;

                    playlists.push({ name: item.name, uri: item.uri });
                } else if (item.type === "folder" && item.items) {
                    extractPlaylists(item.items);
                }
            }
        }

        extractPlaylists(rootlist?.items ?? []);

        if (playlists.length === 0) {
            Spicetify.showNotification("No playlists found in your library", true);
            return;
        }

        const optionsHtml = playlists.map((pl) => {
            const isActive = pl.uri === state.targetPlaylistUri;
            const escapedName = escapeHtml(pl.name);
            return `
                <div class="rl-playlist-item ${isActive ? "rl-active" : ""}" data-value="${escapeHtml(pl.uri)}">
                    <span>${escapedName}</span>
                    <div class="rl-active-indicator"></div>
                </div>`;
        }).join("");

        const content = document.createElement("div");
        content.className = "rl-injected rl-picker-modal";
        content.innerHTML = `
            <div class="rl-glass-content-wrapper">
                <div class="rl-header-controls">
                    <input id="rl-search" type="text" placeholder="Search or paste a playlist link..." class="rl-search" />
                    <div id="rl-top-toggle" class="rl-flex-row">
                        <div class="rl-text-group">
                            <span class="rl-primary-text">Add songs to top</span>
                            <span class="rl-secondary-text">New songs appear first in the playlist</span>
                        </div>
                        <div class="rl-toggle-container">
                            <div class="rl-switch ${state.addToTop ? "rl-switch-on" : ""}">
                                <div class="rl-switch-track"></div>
                                <div class="rl-switch-knob"></div>
                            </div>
                        </div>
                    </div>
                    <button id="rl-clear-btn" class="rl-btn-ghost ${state.targetPlaylistUri ? "" : "rl-hidden"}">
                        Reset to Liked Songs
                    </button>
                </div>
                <div class="rl-playlist-list">
                    ${optionsHtml}
                </div>
            </div>
        `;

        Spicetify.PopupModal.display({
            title: "Choose a playlist",
            content,
        });

        const searchInput = content.querySelector("#rl-search");
        const topToggle = content.querySelector("#rl-top-toggle");
        const playlistItems = content.querySelectorAll(".rl-playlist-item");

        playlistItems.forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const uri = item.getAttribute("data-value");
                const name = item.querySelector("span").textContent;

                playlistItems.forEach(el => el.classList.remove("rl-active"));
                item.classList.add("rl-active");

                if (!uri) {
                    state.targetPlaylistUri = "";
                    resetValidityCache();
                    persist();
                    Spicetify.showNotification("Playlist reset!");
                    Spicetify.PopupModal.hide();
                    return;
                }

                Spicetify.PopupModal.hide();
                setTimeout(() => showConfirmation(name, uri), 200);
            });
        });

        topToggle?.addEventListener("click", () => {
            state.addToTop = !state.addToTop;
            persist();
            const switchEl = content.querySelector(".rl-switch");
            if (state.addToTop) {
                switchEl.classList.add("rl-switch-on");
            } else {
                switchEl.classList.remove("rl-switch-on");
            }
            Spicetify.showNotification(state.addToTop ? "Songs will be added to the top" : "Songs will be added to the bottom");
        });

        // filter playlist entries as the query changes.
        searchInput?.addEventListener("input", () => {
            const query = searchInput.value.toLowerCase();
            playlistItems.forEach(el => {
                const val = el.getAttribute("data-value");
                if (!val) return;
                const name = el.querySelector("span").textContent.toLowerCase();

                // preserve the flex layout for visible playlist entries.
                if (name.includes(query)) {
                    el.style.display = "flex";
                } else {
                    el.style.display = "none";
                }
            });
        });

        // quick select & link parsing on enter
        searchInput?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault(); // prevent the modal from submitting.
                const rawVal = searchInput.value.trim();
                if (!rawVal) return;

                // handle a direct spotify playlist link or uri first.
                const pastedUri = normalizePlaylistUri(rawVal);
                if (pastedUri) {
                    const found = playlists.find(pl => pl.uri === pastedUri);
                    const name = found ? found.name : "Custom Playlist";
                    Spicetify.PopupModal.hide();
                    setTimeout(() => showConfirmation(name, pastedUri), 200);
                    return;
                }

                // otherwise select the first result that remains visible.
                const firstVisible = Array.from(playlistItems).find(el => el.style.display !== "none");
                if (firstVisible) {
                    firstVisible.click(); // reuse the playlist item's click handler.
                }
            }
        });

        content.querySelector("#rl-clear-btn")?.addEventListener("click", () => {
            state.targetPlaylistUri = "";
            resetValidityCache();
            persist();
            Spicetify.showNotification("Playlist reset!");
            Spicetify.PopupModal.hide();
        });

    } catch (err) {
        console.error(`[${EXT_NAME}] Playlist picker error:`, err);
        const raw = prompt("Paste the target playlist URL or URI:");
        if (!raw) return;
        const uri = normalizePlaylistUri(raw);
        if (uri) {
            await setTargetPlaylist(uri, "Target playlist saved");
        } else {
            Spicetify.showNotification("That doesn't look like a valid playlist link", true);
        }
    }
}
