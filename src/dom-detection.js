import { EXT_NAME, NOW_PLAYING_SELECTOR } from "./constants.js";

// resolve a playable uri from the button's dom context.
export function resolveTrackUri(buttonEl, allowFallback = true) {
    // prefer the currently playing item for controls in the player bar.
    const isInNowPlaying = !!buttonEl.closest(NOW_PLAYING_SELECTOR);
    if (isInNowPlaying) {
        return Spicetify.Player.data?.item?.uri ?? null;
    }

    const isValidUri = (uri) => {
        if (typeof uri !== "string") return false;
        return uri.startsWith("spotify:track:") ||
            uri.startsWith("spotify:episode:") ||
            uri.startsWith("spotify:local:");
    };

    const extractUriFromHref = (href) => {
        const m = href.match(/\/(track|episode)\/([A-Za-z0-9]{22})/);
        if (m) return `spotify:${m[1]}:${m[2]}`;
        if (href.includes("/local/")) {
            const parts = href.split("/local/");
            if (parts[1]) {
                const clean = parts[1].split(/[\?#]/)[0];
                if (clean) return `spotify:local:${clean}`;
            }
        }
        return null;
    };

    // inspect ancestor data attributes and links first.
    let el = buttonEl;
    for (let i = 0; i < 25; i++) {
        if (!el) break;
        const uri = el.dataset?.uri ?? el.getAttribute("data-uri");
        if (isValidUri(uri)) return uri;
        if (el.tagName === "A") {
            const href = el.getAttribute("href") ?? "";
            const matchedUri = extractUriFromHref(href);
            if (matchedUri) return matchedUri;
        }
        el = el.parentElement;
    }

    // fall back to the nearest tracklist row when ancestors do not expose a uri.
    el = buttonEl;
    let row = null;
    for (let i = 0; i < 25; i++) {
        if (!el) break;
        const testId = el.getAttribute?.("data-testid") ?? "";
        const role = el.getAttribute?.("role") ?? "";
        if (
            testId === "tracklist-row" ||
            testId === "track-row" ||
            role === "row" ||
            role === "listitem" ||
            el.classList?.contains("tracklist-row")
        ) {
            row = el;
            break;
        }
        el = el.parentElement;
    }

    if (row) {
        const uriEl = row.querySelector("[data-uri*='spotify:track:'], [data-uri*='spotify:episode:'], [data-uri*='spotify:local:']");
        if (uriEl) {
            const uri = uriEl.getAttribute("data-uri");
            if (isValidUri(uri)) return uri;
        }
        const link = row.querySelector("a[href*='/track/'], a[href*='/episode/'], a[href*='/local/']");
        if (link) {
            const href = link.getAttribute("href") ?? "";
            const matchedUri = extractUriFromHref(href);
            if (matchedUri) return matchedUri;
        }
    }

    // inspect react fiber props as a last resort before using the player state.
    el = buttonEl;
    for (let i = 0; i < 25; i++) {
        if (!el) break;
        const fiberKey = Object.keys(el).find(
            k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
        );
        if (fiberKey) {
            let fiber = el[fiberKey];
            for (let j = 0; j < 15; j++) {
                if (!fiber) break;
                const props = fiber.memoizedProps ?? fiber.pendingProps ?? {};
                if (isValidUri(props.uri)) return props.uri;
                if (isValidUri(props.track?.uri)) return props.track.uri;
                if (isValidUri(props.trackUri)) return props.trackUri;
                if (isValidUri(props.item?.uri)) return props.item.uri;
                if (isValidUri(props.data?.uri)) return props.data.uri;
                if (isValidUri(props.model?.uri)) return props.model.uri;
                if (Array.isArray(props.children)) {
                    for (const child of props.children) {
                        if (isValidUri(child?.props?.uri)) return child.props.uri;
                    }
                }
                fiber = fiber.return;
            }
        }
        el = el.parentElement;
    }

    if (allowFallback) {
        return Spicetify.Player.data?.item?.uri ?? null;
    }

    console.warn(`[${EXT_NAME}] Could not resolve item URI from DOM for button:`, buttonEl);
    return null;
}

export function isPopoverOrNavigationButton(el) {
    if (!(el instanceof Element)) return false;
    const text = (el.textContent ?? "").toLowerCase().trim();
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    const testId = (el.getAttribute("data-testid") ?? "").toLowerCase();

    const matchesWords = (str) => {
        return str === "done" || str === "cancel" || str === "close" || str === "dismiss" || str === "back";
    };

    return matchesWords(text) || matchesWords(ariaLabel) || matchesWords(testId) ||
        ariaLabel.includes("done") || ariaLabel.includes("cancel") || ariaLabel.includes("close") || ariaLabel.includes("dismiss") ||
        testId.includes("done") || testId.includes("cancel") || testId.includes("close");
}

export function isRemovalButton(el) {
    if (!(el instanceof Element)) return false;

    const testId = (el.getAttribute("data-testid") ?? "").toLowerCase();
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    const text = (el.textContent ?? "").toLowerCase();

    const isRemovalText = (str) => {
        return str.includes("remove") ||
            str.includes("delete") ||
            str.includes("unlike") ||
            str.includes("dislike") ||
            str.includes("dismiss");
    };

    if (testId === "added-button") return true;
    if (isRemovalText(testId) || isRemovalText(ariaLabel) || isRemovalText(text)) return true;

    const fiberKey = Object.keys(el).find(
        k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
    );
    if (fiberKey) {
        let fiber = el[fiberKey];
        for (let depth = 0; fiber && depth < 8; depth++) {
            const props = fiber.memoizedProps ?? fiber.pendingProps;
            if (props) {
                const propsText = (props["aria-label"] ?? props.ariaLabel ?? props.label ?? props.text ?? "").toLowerCase();
                if (isRemovalText(propsText)) return true;
                if (props.action === "remove" || props.mode === "remove") return true;
            }
            fiber = fiber.return;
        }
    }

    return false;
}

export function isInPopupOrMenu(el) {
    if (!(el instanceof Element)) return false;
    return !!el.closest(
        "[role='dialog'], " +
        "[role='menu'], " +
        ".main-contextMenu-menu, " +
        ".main-modal-container, " +
        "[data-testid='add-to-playlist-menu'], " +
        ".sp-popover, " +
        ".popover"
    );
}

export function isLikeButton(el) {
    if (!(el instanceof Element)) return false;
    if (isRemovalButton(el) || isPopoverOrNavigationButton(el)) return false;
    const testId = el.getAttribute("data-testid") ?? "";
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    if (["heart-button", "save-button"].includes(testId)) return true;
    if (testId.includes("heart") || testId.includes("save")) return true;
    if (
        ariaLabel.includes("save to your liked songs") ||
        ariaLabel.includes("add to liked songs") ||
        ariaLabel.includes("liked songs") ||
        ariaLabel.includes("save to library") ||
        ariaLabel === "like"
    ) return true;
    return false;
}


export function isAddButton(el) {
    if (!(el instanceof Element)) return false;
    if (isRemovalButton(el) || isPopoverOrNavigationButton(el)) return false;
    const testId = el.getAttribute("data-testid") ?? "";
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    if (testId === "added-button") return false;
    if (
        ariaLabel.includes("remove from") ||
        ariaLabel.includes("added to") ||
        ariaLabel.includes("in your library")
    ) return false;
    if (el.getAttribute("aria-checked") === "true") return false;
    if (testId.startsWith("add") || testId.includes("add-to-playlist")) return true;
    if (
        ariaLabel.includes("add to playlist") ||
        ariaLabel.includes("add to your library") ||
        ariaLabel.includes("save to your library") ||
        ariaLabel.includes("add to your liked") ||
        ariaLabel.includes("add to liked") ||
        ariaLabel === "add"
    ) return true;
    // Search results put the track name in the label, e.g. "Save Faded to Your Library"
    if (/^(save|add) .+ to (your library|your liked songs|liked songs)$/.test(ariaLabel)) return true;
    return false;
}


export function isAlreadyAddedButton(el) {
    if (!(el instanceof Element)) return false;
    const testId = el.getAttribute("data-testid") ?? "";
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    if (testId === "added-button") return true;
    if (el.getAttribute("aria-checked") === "true" && testId.includes("add")) return true;
    if (
        ariaLabel.includes("remove from your library") ||
        ariaLabel.includes("remove from your liked songs") ||
        ariaLabel.includes("added to your library") ||
        ariaLabel.includes("in your library") ||
        ariaLabel.includes("remove from")
    ) return true;
    return false;
}


export function inspectFiberForButtonType(el) {
    if (!el) return null;
    const fiberKey = Object.keys(el).find(
        k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
    );
    if (!fiberKey) return null;

    let fiber = el[fiberKey];
    for (let depth = 0; fiber && depth < 8; depth++) {
        const type = fiber.type;
        if (type) {
            const name = type.name || type.displayName || "";
            if (
                name.includes("LikeButton") ||
                name.includes("HeartButton") ||
                name.includes("SaveButton") ||
                name.includes("AddButton") ||
                name.includes("AddToPlaylistButton") ||
                name.includes("FeedbackButton")
            ) {
                return "like-or-add";
            }
        }

        const props = fiber.memoizedProps ?? fiber.pendingProps;
        if (props) {
            const testId = (props["data-testid"] ?? props.testId ?? "").toLowerCase();
            const ariaLabel = (props["aria-label"] ?? props.ariaLabel ?? "").toLowerCase();
            if (testId.includes("heart") || testId.includes("save") || testId.startsWith("add")) {
                return "like-or-add";
            }
            if (
                ariaLabel.includes("save to your liked songs") ||
                ariaLabel.includes("add to liked songs") ||
                ariaLabel.includes("add to your library") ||
                ariaLabel.includes("save to your library") ||
                ariaLabel.includes("add to playlist") ||
                ariaLabel === "add" ||
                ariaLabel === "like"
            ) {
                return "like-or-add";
            }
        }
        fiber = fiber.return;
    }
    return null;
    
}

// search results label their save button "Save <track name> to Your Library".
export function isSearchStyleSaveButton(el) {
    if (!(el instanceof Element)) return false;
    const label = (el.getAttribute("aria-label") ?? "").toLowerCase();
    return /^(save|add) .+ to (your library|your liked songs|liked songs)$/.test(label);
}

// manually switch redirected search-result buttons to the green "added" state.
const ADDED_CHECK_PATH = "M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m11.748-1.97a.75.75 0 0 0-1.06-1.06l-4.47 4.47-1.405-1.406a.75.75 0 1 0-1.061 1.06l2.466 2.467 5.53-5.53z";

export function markButtonAdded(el, targetUri) {
    try {
        el.dataset.rlAdded = targetUri;
        [...el.classList].filter(c => c.endsWith("text-subdued")).forEach(c => el.classList.remove(c));
        el.classList.add("encore-internal-color-text-bright-accent");
        const svg = el.querySelector("svg");
        const paths = svg ? svg.querySelectorAll("path") : [];
        if (paths.length) {
            svg.style.setProperty("--encore-icon-fill", "var(--text-bright-accent)");
            paths[0].setAttribute("d", ADDED_CHECK_PATH);
            for (let i = 1; i < paths.length; i++) paths[i].style.display = "none";
        }
    } catch (err) {
        console.warn(`[${EXT_NAME}] Could not update button state:`, err);
    }
}