import { escapeHtml } from "../utils.js";
import { setTargetPlaylist } from "../playlist.js";

export function showConfirmation(playlistName, playlistUri) {
    const content = document.createElement("div");
    content.className = "rl-injected rl-confirm-modal";
    const escapedName = escapeHtml(playlistName);
    content.innerHTML = `
        <div class="rl-glass-content-wrapper">
            <p class="rl-confirm-text">
                Songs will be quick-added to <strong>${escapedName}</strong><br/>
                <span class="rl-confirm-sub">Every + tap sends tracks straight here.</span>
            </p>
            <div class="rl-modal-footer">
                <button id="rl-cancel" class="rl-btn rl-btn-text">Go back</button>
                <button id="rl-confirm" class="rl-btn rl-btn-primary">Set as target</button>
            </div>
        </div>
    `;

    Spicetify.PopupModal.display({
        title: "Set as Redirect Likes target?",
        content,
    });

    content.querySelector("#rl-confirm")?.addEventListener("click", async () => {
        const saved = await setTargetPlaylist(playlistUri, "Target playlist updated");
        if (saved) Spicetify.PopupModal.hide();
    });
    content.querySelector("#rl-cancel")?.addEventListener("click", () => {
        Spicetify.PopupModal.hide();
    });
}
