import { NOW_PLAYING_SELECTOR } from "./constants.js";
import { state, disposers } from "./state.js";
import { addToTargetPlaylist } from "./playlist.js";
import { withRedirectedLibraryAdd } from "./library-patch.js";
import {
    resolveTrackUri,
    isPopoverOrNavigationButton,
    isRemovalButton,
    isInPopupOrMenu,
    isLikeButton,
    isAddButton,
    isAlreadyAddedButton,
    inspectFiberForButtonType,
    isSearchStyleSaveButton,
    markButtonAdded,
} from "./dom-detection.js";

async function onDocumentClick(e) {
    if (!state.targetPlaylistUri) return;

    const button = e.target instanceof Element
        ? e.target.closest("button, [role='button']")
        : null;
    if (!button) return;
    
    // ignore repeat clicks on buttons already added to this target playlist.
    if (button.dataset?.rlAdded && button.dataset.rlAdded === state.targetPlaylistUri) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
    }

    if (isAlreadyAddedButton(button) || isRemovalButton(button) || isPopoverOrNavigationButton(button) || isInPopupOrMenu(button)) return;

    const isInNowPlaying = !!button.closest(NOW_PLAYING_SELECTOR);

    const isAdd = isAddButton(button);
    const isLike = isLikeButton(button);
    const isFiberLikeOrAdd = inspectFiberForButtonType(button) === "like-or-add";
    const isDetected = isAdd || isLike || isFiberLikeOrAdd;

    if (isInNowPlaying && isDetected) {
        const ariaChecked = button.getAttribute("aria-checked");
        if (ariaChecked === "true") return;

        const itemUri = Spicetify.Player.data?.item?.uri ?? null;
        if (!itemUri) return;

        e.stopImmediatePropagation();
        e.preventDefault();

        await withRedirectedLibraryAdd(() => addToTargetPlaylist(itemUri));
        return;
    }

    if (isDetected) {
        if (isLike && !isAdd && !state.preventLike) return;

        const ariaChecked = button.getAttribute("aria-checked");
        if (ariaChecked === "true") return;

        const itemUri = resolveTrackUri(button, false);
        if (!itemUri) return;

        e.stopImmediatePropagation();
        e.preventDefault();

        const added = await withRedirectedLibraryAdd(() => addToTargetPlaylist(itemUri));
        // only mark it if the song really went to the target playlist (not the Liked Songs fallback)
        if (added && state.targetPlaylistUri && isSearchStyleSaveButton(button)) {
            markButtonAdded(button, state.targetPlaylistUri);
        }
        return;
    }
}

// capture clicks before spotify's handlers.
export function installClickInterceptor() {
    document.addEventListener("pointerdown", onDocumentClick, { capture: true });
    document.addEventListener("mousedown", onDocumentClick, { capture: true });
    document.addEventListener("click", onDocumentClick, { capture: true });
    disposers.push(() => {
        document.removeEventListener("pointerdown", onDocumentClick, { capture: true });
        document.removeEventListener("mousedown", onDocumentClick, { capture: true });
        document.removeEventListener("click", onDocumentClick, { capture: true });
    });
}
