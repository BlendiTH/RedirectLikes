(() => {
  // src/constants.js
  var EXT_NAME = "RedirectLikes";
  var CONFIG_PLAYLIST_URI = `${EXT_NAME}:playlistUri`;
  var CONFIG_PREVENT_LIKE = `${EXT_NAME}:preventLike`;
  var CONFIG_ADD_TO_TOP = `${EXT_NAME}:addToTop`;
  var DEBOUNCE_MS = 5000;
  var VALIDITY_CACHE_TTL = 30000;
  var NOW_PLAYING_SELECTOR = [
    ".now-playing-bar",
    "[data-testid='now-playing-bar']",
    ".main-nowPlayingBar-container",
    ".main-nowPlayingWidget-nowPlaying",
    "[data-testid='now-playing-widget']",
    "[data-testid='now-playing-view']",
    "[data-testid='CoverSlotExpanded__container']",
    ".main-nowPlayingBar-left",
    ".main-nowPlayingBar-right",
    ".Root__now-playing-bar"
  ].join(", ");

  // src/state.js
  var state = {
    targetPlaylistUri: "",
    preventLike: true,
    addToTop: false,
    validityCache: { uri: "", valid: false, ts: 0 },
    originalLibraryAdd: null
  };
  var disposers = [];
  function loadState() {
    state.targetPlaylistUri = Spicetify.LocalStorage.get(CONFIG_PLAYLIST_URI) ?? "";
    state.preventLike = Spicetify.LocalStorage.get(CONFIG_PREVENT_LIKE) !== "false";
    const rawTop = Spicetify.LocalStorage.get(CONFIG_ADD_TO_TOP);
    state.addToTop = rawTop === "true" || rawTop === true;
  }
  function persist() {
    Spicetify.LocalStorage.set(CONFIG_PLAYLIST_URI, state.targetPlaylistUri);
    Spicetify.LocalStorage.set(CONFIG_PREVENT_LIKE, String(state.preventLike));
    Spicetify.LocalStorage.set(CONFIG_ADD_TO_TOP, String(state.addToTop));
  }
  function resetValidityCache() {
    state.validityCache = { uri: "", valid: false, ts: 0 };
  }

  // src/styles.css
  var styles_default = `        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .rl-injected, .rl-injected * { box-sizing: border-box; }

        :root {
            --rl-bg-base: #0c0c0c;
            --rl-bg-panel: rgba(12, 12, 12, 0.15); /* Maximized glass transparency */
            /* NB! change opacity / brightness from the line on top -> main modal window */
            --rl-bg-overlay: rgba(0, 0, 0, 0.4);
            --rl-bg-elevated: rgba(255, 255, 255, 0.04);
            --rl-bg-hover: rgba(255, 255, 255, 0.07);
            --rl-border: rgba(255, 255, 255, 0.08);
            --rl-border-focus: rgba(255, 255, 255, 0.20);
            --rl-text-primary: #ffffff;
            --rl-text-secondary: #8e8e93;
            --rl-text-disabled: #48484a;
            --rl-toggle-on: #ffffff;
            --rl-toggle-off: rgba(255, 255, 255, 0.15);
            --rl-shadow: 0 24px 64px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06);
            --rl-font-ui: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            --rl-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
            --rl-transition-duration: 200ms;
            --rl-transition-ease: cubic-bezier(0.25, 1, 0.5, 1);
            --rl-animation-timing: cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* modal reset */
        .main-modal-container {
            background: transparent !important;
            background-color: transparent !important;
        }

        /* trigger ui only if it's DOM */
        body:has(.rl-injected) .GenericModal-overlay, 
        body:has(.rl-injected) .GenericModal__overlay,
        body:has(.rl-injected) .main-modal-containerBackDrop,
        body:has(.rl-injected) .main-modal-backdrop,
        body:has(.rl-injected) [data-backdrop="true"] {
            background: rgba(0, 0, 0, 0.6) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 9999 !important;
        }

        /* main glass modal*/
        .main-modal-modal:has(.rl-injected),
        .GenericModal:has(.rl-injected),
        div[role="dialog"].main-modal-modal:has(.rl-injected),
        [class*="Modal-container"]:has(.rl-injected) {
            width: 520px !important;
            max-height: 85vh !important;
            background: var(--rl-bg-panel) !important;
            backdrop-filter: blur(40px) saturate(180%) brightness(0.95) !important;
            -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(0.95) !important;
            border-radius: 16px !important;
            padding: 0 !important; /* important! kills outer gap so header mounts perfectly flush to the top */
            
            /* high precision border glare + shadow */
            border: 1px solid rgba(255, 255, 255, 0.10) !important;
            box-shadow: 
                0 32px 64px -16px rgba(0, 0, 0, 0.85),
                0 16px 32px -8px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
                
            overflow: hidden !important; 
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            font-family: var(--rl-font-ui) !important;
            color: var(--rl-text-primary) !important;
            animation: rl-popup 0.3s var(--rl-animation-timing) forwards !important;
        }

        @keyframes rl-popup {
            0% { opacity: 0; transform: scale(0.97) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* reset inner backgrounds & strip wrapper padding */
        .GenericModal:has(.rl-injected) > div, 
        .GenericModal:has(.rl-injected) > div > div,
        .main-modal-modal:has(.rl-injected) .main-modal-modalContent,
        .GenericModal:has(.rl-injected) .GenericModal__body,
        .rl-injected,
        .rl-glass-panel,
        .rl-panel {
            background: transparent !important;
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            overflow-y: visible !important;
            border-radius: 0 !important;
            padding: 0 !important; /* important!! kills the weird gap between header and controls */
        }

        /* scope headers */

        /* primary: header is the element containing the close button */
        div[role="dialog"]:has(.rl-picker-modal) :has(> button[aria-label="Close" i]),
        [data-encore-id]:has(.rl-picker-modal) :has(> button[aria-label="Close" i]),

        /* positional: header is always the first child inside the wrapper */
        div[role="dialog"]:has(.rl-picker-modal) > * > :first-child,
        div[role="dialog"]:has(.rl-picker-modal) > :first-child > :first-child,

        /* legacy: class selectors for older Spicetify/Spotify versions */
        .main-modal-modal:has(.rl-picker-modal):has(.rl-picker-modal) .main-modal-modalHeader,
        .GenericModal:has(.rl-picker-modal):has(.rl-picker-modal) .GenericModal__header,

        /* attribute selectors for Encore design system */
        .main-modal-modal:has(.rl-picker-modal) [data-encore-id="dialogHeader"],
        .GenericModal:has(.rl-picker-modal) [data-encore-id="dialogHeader"],
        .main-modal-modal:has(.rl-picker-modal) header,
        .GenericModal:has(.rl-picker-modal) header {
            background: rgba(18, 18, 18, 0.55) !important; /* Darker frosted glass */
            background-color: rgba(18, 18, 18, 0.55) !important;
            border-bottom: none !important;

            /* restore top/side padding, keep bottom at 0 for flush mount */
            padding: 24px 24px 0 24px !important;

            /* ensure text and button align properly horizontally */
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;

            border-radius: 16px 16px 0 0 !important;
            margin: 0 !important;
            top: 0 !important;
            transform: translateY(0) !important;
            overflow: hidden !important; /* prevents h1 margin collapse */
        }

        /* picker modal ONLY */

        /* kill all spacing on intermediate wrappers (3 diff levels) */
        .main-modal-modal:has(.rl-picker-modal) > *,
        .main-modal-modal:has(.rl-picker-modal) > * > *,
        .main-modal-modal:has(.rl-picker-modal) > * > * > *,
        .GenericModal:has(.rl-picker-modal) > *,
        .GenericModal:has(.rl-picker-modal) > * > *,
        .GenericModal:has(.rl-picker-modal) > * > * > * {
            margin: 0 !important;
            padding-top: 0 !important;
            border-top: none !important;
            gap: 0 !important;
            inset: unset !important;
        }

        /* encore uses ::before/::after for decorative spacing */
        .main-modal-modal:has(.rl-picker-modal)::before,
        .main-modal-modal:has(.rl-picker-modal)::after,
        .GenericModal:has(.rl-picker-modal)::before,
        .GenericModal:has(.rl-picker-modal)::after,
        .main-modal-modal:has(.rl-picker-modal) > *::before,
        .main-modal-modal:has(.rl-picker-modal) > *::after,
        .GenericModal:has(.rl-picker-modal) > *::before,
        .GenericModal:has(.rl-picker-modal) > *::after,
        .main-modal-modal:has(.rl-picker-modal) > * > *::before,
        .main-modal-modal:has(.rl-picker-modal) > * > *::after,
        .GenericModal:has(.rl-picker-modal) > * > *::before,
        .GenericModal:has(.rl-picker-modal) > * > *::after {
            display: none !important;
            content: none !important;
            height: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        /* inline style override, react may inject style="margin-top:Xpx" though */
        .main-modal-modal:has(.rl-picker-modal) > [style],
        .main-modal-modal:has(.rl-picker-modal) > * > [style],
        .GenericModal:has(.rl-picker-modal) > [style],
        .GenericModal:has(.rl-picker-modal) > * > [style] {
            margin-top: 0 !important;
            padding-top: 0 !important;
            top: 0 !important;
        }

        /* encore dialog wrapper w/ spotify's design system containers */
        .main-modal-modal:has(.rl-picker-modal) [data-encore-id],
        .GenericModal:has(.rl-picker-modal) [data-encore-id],
        .main-modal-modal:has(.rl-picker-modal) [data-testid],
        .GenericModal:has(.rl-picker-modal) [data-testid],
        .encore-dialog-wrapper:has(.rl-picker-modal) {
            margin-top: 0 !important;
            padding-top: 0 !important;
            gap: 0 !important;
            border-top: none !important;
        }

        /* flex alignment that forces content to stack from the absolute top */
        .main-modal-modal:has(.rl-picker-modal),
        .GenericModal:has(.rl-picker-modal),
        .main-modal-modal:has(.rl-picker-modal) > div,
        .GenericModal:has(.rl-picker-modal) > div {
            gap: 0 !important;
            margin-top: 0 !important;
            padding-top: 0 !important;
            justify-content: flex-start !important;
            align-content: flex-start !important;
        }

        /* inner wrapper */
        .rl-glass-content-wrapper {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            max-height: calc(85vh - 70px) !important;
            padding: 0 !important; /* CRITICAL: Allows controls to hit the edges */
        }

        /* rows */
        .rl-flex-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: rgba(255, 255, 255, 0.03) !important;
            padding: 14px 18px !important;
            border-radius: 14px !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            cursor: pointer !important;
            transition: all var(--rl-transition-duration) var(--rl-transition-ease) !important;
        }
        .rl-flex-row:hover {
            background: rgba(255, 255, 255, 0.05) !important;
            border-color: rgba(255, 255, 255, 0.09) !important;
            transform: scale(0.995);
        }
        .rl-text-group {
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
        }
        .rl-primary-text {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            color: #ffffff !important;
        }
        .rl-secondary-text {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 13px !important;
            font-weight: 400 !important;
            color: var(--rl-text-secondary) !important;
        }

        /* toggle */
        .rl-toggle-container {
            opacity: 1 !important;
            display: flex !important;
            align-items: center !important;
        }
        
        /* switch styling */
        .rl-switch {
            position: relative !important;
            width: 40px !important;
            height: 22px !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
        }

        .rl-switch-track {
            position: absolute !important;
            inset: 0 !important;
            border-radius: 6px !important; /* Squarish desktop aesthetic */
            background: rgba(0, 0, 0, 0.3) !important;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
            transition: background 0.25s ease, border-color 0.25s ease !important;
        }

        .rl-switch-on .rl-switch-track {
            background: rgba(255, 255, 255, 0.15) !important; /* Soft light background when ON */
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
        }

        .rl-switch-knob {
            position: absolute !important;
            top: 3px !important;
            left: 3px !important;
            width: 16px !important;
            height: 16px !important;
            border-radius: 4px !important; /* Matching squarish knob */
            background: rgba(255, 255, 255, 0.6) !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4) !important;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.25s ease !important;
        }

        .rl-switch-on .rl-switch-knob {
            transform: translateX(18px) !important;
            background: #ffffff !important; /* Bright white when ON */
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
        }

        .main-modal-modal:has(.rl-injected) .main-modal-closeButton:hover,
        .GenericModal:has(.rl-injected) .GenericModal__closeButton:hover,
        .main-modal-modal:has(.rl-injected) > button[aria-label="Close"]:hover {
            background: transparent !important;
            color: rgba(255, 255, 255, 1) !important; /* Bright white on hover */
            transform: scale(1.15) !important; /* Slight pop */
        }

        /* search */
        .rl-search {
            width: 100%;
            height: 42px;
            padding: 0 16px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.07);
            background: rgba(0, 0, 0, 0.20);
            color: var(--rl-text-primary);
            font-family: var(--rl-font-ui);
            font-size: 13.5px;
            font-weight: 500;
            outline: none;
            transition: all var(--rl-transition-duration) var(--rl-transition-ease);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
            -webkit-appearance: none;
        }
        .rl-search:focus {
            border-color: rgba(255, 255, 255, 0.20);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.30);
        }
        .rl-search::placeholder { color: var(--rl-text-secondary); }

        /* header controls (bottom half of the dark glass block) */
        .rl-header-controls {
            display: flex !important;
            flex-direction: column !important;
            gap: 16px !important;
            background: rgba(18, 18, 18, 0.55) !important; /* Matches native header exactly */
            padding: 16px 24px 24px 24px !important;
            border-bottom: none !important;
            border-radius: 0 0 24px 24px !important; /* Smooth rounded transition into base glass */
            box-shadow: none !important;
            flex-shrink: 0 !important;
            position: relative !important;
            z-index: 10 !important;
            margin: 0 !important;
        }

        /* clamp headers (scoped to prevent native override) */
        .main-modal-modal:has(.rl-injected) .main-modal-modalHeader h1,
        .GenericModal:has(.rl-injected) .GenericModal__header h1,
        .main-modal-modal:has(.rl-injected) .main-modal-modalHeader span,
        .GenericModal:has(.rl-injected) .GenericModal__header span,
        .GenericModal:has(.rl-injected) h1, 
        .GenericModal:has(.rl-injected) h2 {
            font-size: 22px !important;
            font-weight: 700 !important;
            letter-spacing: -0.4px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        /* confirmation text */
        .rl-confirm-text {
            margin: 0 !important;
            color: var(--rl-text-secondary) !important;
            font-size: 16px !important;
            line-height: 1.5 !important;
            font-family: var(--rl-font-ui) !important;
        }
        .rl-confirm-sub {
            font-size: 14px !important;
            color: var(--rl-text-disabled) !important;
            display: block !important;
            margin-top: 6px !important;
        }

        .rl-confirm-modal .rl-glass-content-wrapper {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            min-height: 158px !important;
            height: auto !important;
            max-height: none !important;
            padding: 8px 24px 24px 24px !important;
        }

        div[role="dialog"]:has(.rl-confirm-modal) :has(> button[aria-label="Close" i]),
        [data-encore-id]:has(.rl-confirm-modal) :has(> button[aria-label="Close" i]),
        div[role="dialog"]:has(.rl-confirm-modal) [data-encore-id="dialogHeader"],
        .main-modal-modal:has(.rl-confirm-modal) .main-modal-modalHeader,
        .GenericModal:has(.rl-confirm-modal) .GenericModal__header,
        .main-modal-modal:has(.rl-confirm-modal) header,
        .GenericModal:has(.rl-confirm-modal) header {
            padding: 28px 56px 10px 24px !important;
            margin: 0 !important;
            border-bottom: none !important;
        }

        /* playlist list */
        .rl-playlist-list {
            flex: 1 !important;
            overflow-y: auto !important;
            margin-top: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
            padding: 0 24px 24px 24px !important; /* Pushes text perfectly into alignment */
        }

        .rl-playlist-list::-webkit-scrollbar { width: 5px; }
        .rl-playlist-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            transition: background var(--rl-transition-duration) ease !important;
        }
        .rl-playlist-list::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.22);
        }

        /* playlist row typography */
        .rl-playlist-item {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 12px 14px !important;
            border-radius: 10px !important;
            cursor: pointer !important;
            transition: background 0.15s ease !important;
            
            /* swapped to native UI font, bumped weight slightly */
            font-family: var(--rl-font-ui) !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            letter-spacing: 0.2px !important;
            color: var(--rl-text-primary) !important;
            border: 1px solid transparent !important;
        }

        .rl-playlist-item:hover {
            background: rgba(255, 255, 255, 0.05) !important;
        }

        .rl-playlist-item.rl-active {
            background: rgba(255, 255, 255, 0.08) !important;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1) !important;
            font-weight: 600 !important;
        }

        /* softened active indicator */
        .rl-active-indicator {
            width: 6px !important;
            height: 6px !important;
            border-radius: 50% !important;
            background: rgba(255, 255, 255, 0.5) !important; /* dimmed base */
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.4) !important; /* outer glow */
            display: none;
        }

        .rl-playlist-item.rl-active .rl-active-indicator {
            display: block;
        }

        /* buttons */
        .rl-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            height: 36px;
            padding: 0 22px;
            border-radius: 8px;
            font-family: var(--rl-font-ui);
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.01em;
            cursor: pointer;
            border: 1px solid transparent;
            transition: transform 100ms var(--rl-transition-ease), background var(--rl-transition-duration) var(--rl-transition-ease), border-color var(--rl-transition-duration) var(--rl-transition-ease), box-shadow var(--rl-transition-duration) var(--rl-transition-ease);
        }
        .rl-btn:hover { transform: translateY(-1px); }
        .rl-btn:active { transform: translateY(0) scale(0.97); }

        .rl-btn-primary {
            background: #ffffff;
            color: #0a0a0a;
            border-color: #ffffff;
        }
        .rl-btn-primary:hover {
            background: #e0e0e0;
            border-color: #e0e0e0;
        }
        .rl-btn-primary:active { background: #c8c8c8; }

        .rl-btn-text {
            background: transparent;
            border-color: var(--rl-border);
            color: var(--rl-text-primary);
        }
        .rl-btn-text:hover {
            border-color: var(--rl-border-focus);
            background: var(--rl-bg-elevated);
        }

        .rl-btn-ghost {
            background: transparent !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: var(--rl-text-primary) !important;
            padding: 12px 24px !important; 
            border-radius: 12px !important; 
            font-family: var(--rl-font-ui) !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all var(--rl-transition-duration) var(--rl-transition-ease) !important;
            
            /* full width alignment fix */
            width: 100% !important; 
            display: flex !important;
            justify-content: center !important; 
            align-items: center !important;
            margin-top: 0 !important; 
        }
        .rl-btn-ghost:hover {
            background: rgba(255, 255, 255, 0.05) !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
            transform: scale(0.99);
        }

        /* confirmation */
        .rl-confirm-text strong {
            color: var(--rl-text-primary);
            font-weight: 600;
        }
        .rl-modal-footer {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: auto;
            padding-top: 28px;
        }

        .rl-hidden {
            display: none !important;
        }

        /* redirect likes menu icon overrides */
        .main-contextMenu-menuItem:has(.rl-settings-icon),
        .main-contextMenu-menuItemButton:has(.rl-settings-icon),
        li:has(.rl-settings-icon),
        button:has(.rl-settings-icon),
        span:has(.rl-settings-icon),
        div:has(.rl-settings-icon) {
            overflow: visible !important;
        }
        .rl-settings-icon {
            width: 16px !important;
            height: 16px !important;
            display: block !important;
            overflow: visible !important;
        }

`;

  // src/ui/styles.js
  function injectStyles() {
    const rlStyles = function injectPremiumStyles() {
      let style = document.getElementById("rl-premium-styles");
      if (style)
        return style;
      style = document.createElement("style");
      style.id = "rl-premium-styles";
      style.textContent = styles_default;
      document.head.appendChild(style);
      return style;
    }();
    disposers.push(() => rlStyles?.remove());
  }

  // src/utils.js
  function isPlayableUri(uri) {
    return typeof uri === "string" && (uri.startsWith("spotify:track:") || uri.startsWith("spotify:episode:") || uri.startsWith("spotify:local:"));
  }
  function escapeHtml(str) {
    if (typeof str !== "string")
      return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function normalizePlaylistUri(raw) {
    if (typeof raw !== "string")
      return null;
    const trimmed = raw.trim();
    const urlMatch = trimmed.match(/open\.spotify\.com\/playlist\/([A-Za-z0-9]{22})(?:[\/?#]|$)/);
    if (urlMatch)
      return `spotify:playlist:${urlMatch[1]}`;
    if (/^spotify:playlist:[A-Za-z0-9]{22}$/.test(trimmed))
      return trimmed;
    return null;
  }

  // src/playlist.js
  var _recentAdds = new Map;
  function isEditablePlaylist(item) {
    if (typeof item.canAdd === "boolean")
      return item.canAdd;
    if (typeof item.isOwnedBySelf === "boolean")
      return item.isOwnedBySelf;
    return true;
  }
  async function isPlaylistInLibrary(uri) {
    if (!uri)
      return false;
    const now = Date.now();
    if (state.validityCache.uri === uri && now - state.validityCache.ts < VALIDITY_CACHE_TTL) {
      return state.validityCache.valid;
    }
    try {
      let findInItems = function(items) {
        for (const item of items) {
          if (item.type === "playlist" && item.uri === uri) {
            if (!isEditablePlaylist(item)) {
              return false;
            }
            return true;
          }
          if (item.type === "folder" && item.items) {
            const result = findInItems(item.items);
            if (result !== undefined)
              return result;
          }
        }
        return;
      };
      const rootlist = await Spicetify.Platform.RootlistAPI.getContents();
      if (!rootlist || !rootlist.items) {
        console.warn(`[${EXT_NAME}] Could not load rootlist, assuming playlist is valid.`);
        return true;
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
  async function setTargetPlaylist(uri, successMessage = "Target playlist updated") {
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
  async function addToTargetPlaylist(itemUri) {
    const now = Date.now();
    const recentKey = `${state.targetPlaylistUri || "liked"}|${itemUri}`;
    if (_recentAdds.has(recentKey) && now - _recentAdds.get(recentKey) < DEBOUNCE_MS) {
      return true;
    }
    _recentAdds.set(recentKey, now);
    if (_recentAdds.size > 50) {
      for (const [key, ts] of _recentAdds) {
        if (now - ts >= DEBOUNCE_MS)
          _recentAdds.delete(key);
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
    let reallyExists = false;
    try {
      const freshRootlist = await Spicetify.Platform.RootlistAPI.getContents();
      const findUri = (items) => {
        for (const item of items) {
          if (item.uri === state.targetPlaylistUri)
            return true;
          if (item.items && findUri(item.items))
            return true;
        }
        return false;
      };
      reallyExists = findUri(freshRootlist?.items || []);
    } catch (e) {
      reallyExists = true;
    }
    if (!reallyExists) {
      _recentAdds.delete(recentKey);
      state.targetPlaylistUri = "";
      resetValidityCache();
      persist();
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
      state.targetPlaylistUri = "";
      resetValidityCache();
      persist();
      console.warn(`[${EXT_NAME}] Target playlist unavailable. Resetting to Liked Songs.`);
      return await addToLikedSongs(itemUri);
    }
  }
  async function addToLikedSongs(itemUri) {
    try {
      if (state.originalLibraryAdd) {
        await state.originalLibraryAdd({ uris: [itemUri] });
      } else if (Spicetify.CosmosAsync) {
        const id = itemUri.split(":").pop();
        const type = itemUri.split(":")[1] || "tracks";
        const url = type === "episode" ? "https://api.spotify.com/v1/me/episodes" : "https://api.spotify.com/v1/me/tracks";
        await Spicetify.CosmosAsync.put(url, { ids: [id] });
      }
      return true;
    } catch (err) {
      Spicetify.showNotification("Couldn't save to library, please try again!", true);
      console.error(`[${EXT_NAME}]`, err);
      return false;
    }
  }

  // src/library-patch.js
  var _redirectLibraryAddTokens = [];
  function withRedirectedLibraryAdd(fn) {
    const token = {};
    _redirectLibraryAddTokens.push(token);
    return Promise.resolve(fn()).finally(() => {
      const index = _redirectLibraryAddTokens.indexOf(token);
      if (index !== -1)
        _redirectLibraryAddTokens.splice(index, 1);
    });
  }
  function patchLibraryAdd() {
    try {
      if (Spicetify.Platform?.LibraryAPI?.add) {
        state.originalLibraryAdd = Spicetify.Platform.LibraryAPI.add.bind(Spicetify.Platform.LibraryAPI);
        const redirectedLibraryAdd = async function(...args) {
          if (!state.targetPlaylistUri || _redirectLibraryAddTokens.length === 0) {
            return state.originalLibraryAdd(...args);
          }
          const uris = [];
          const extractUris = (val) => {
            if (!val)
              return;
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
                val.items.forEach((item) => extractUris(item.uri || item));
              }
            }
          };
          args.forEach(extractUris);
          if (uris.length > 0) {
            console.log(`[${EXT_NAME}] Intercepted and redirecting LibraryAPI.add for URIs:`, uris);
            let allSuccess = true;
            for (const uri of uris) {
              const success = await addToTargetPlaylist(uri);
              if (!success)
                allSuccess = false;
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
      console.warn(`[${EXT_NAME}] Could not patch LibraryAPI.add:`, patchErr);
      state.originalLibraryAdd = Spicetify.Platform?.LibraryAPI?.add?.bind(Spicetify.Platform.LibraryAPI) ?? null;
    }
  }

  // src/dom-detection.js
  function resolveTrackUri(buttonEl, allowFallback = true) {
    const isInNowPlaying = !!buttonEl.closest(NOW_PLAYING_SELECTOR);
    if (isInNowPlaying) {
      return Spicetify.Player.data?.item?.uri ?? null;
    }
    const isValidUri = (uri) => {
      if (typeof uri !== "string")
        return false;
      return uri.startsWith("spotify:track:") || uri.startsWith("spotify:episode:") || uri.startsWith("spotify:local:");
    };
    const extractUriFromHref = (href) => {
      const m = href.match(/\/(track|episode)\/([A-Za-z0-9]{22})/);
      if (m)
        return `spotify:${m[1]}:${m[2]}`;
      if (href.includes("/local/")) {
        const parts = href.split("/local/");
        if (parts[1]) {
          const clean = parts[1].split(/[\?#]/)[0];
          if (clean)
            return `spotify:local:${clean}`;
        }
      }
      return null;
    };
    let el = buttonEl;
    for (let i = 0;i < 25; i++) {
      if (!el)
        break;
      const uri = el.dataset?.uri ?? el.getAttribute("data-uri");
      if (isValidUri(uri))
        return uri;
      if (el.tagName === "A") {
        const href = el.getAttribute("href") ?? "";
        const matchedUri = extractUriFromHref(href);
        if (matchedUri)
          return matchedUri;
      }
      el = el.parentElement;
    }
    el = buttonEl;
    let row = null;
    for (let i = 0;i < 25; i++) {
      if (!el)
        break;
      const testId = el.getAttribute?.("data-testid") ?? "";
      const role = el.getAttribute?.("role") ?? "";
      if (testId === "tracklist-row" || testId === "track-row" || role === "row" || role === "listitem" || el.classList?.contains("tracklist-row")) {
        row = el;
        break;
      }
      el = el.parentElement;
    }
    if (row) {
      const uriEl = row.querySelector("[data-uri*='spotify:track:'], [data-uri*='spotify:episode:'], [data-uri*='spotify:local:']");
      if (uriEl) {
        const uri = uriEl.getAttribute("data-uri");
        if (isValidUri(uri))
          return uri;
      }
      const link = row.querySelector("a[href*='/track/'], a[href*='/episode/'], a[href*='/local/']");
      if (link) {
        const href = link.getAttribute("href") ?? "";
        const matchedUri = extractUriFromHref(href);
        if (matchedUri)
          return matchedUri;
      }
    }
    el = buttonEl;
    for (let i = 0;i < 25; i++) {
      if (!el)
        break;
      const fiberKey = Object.keys(el).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
      if (fiberKey) {
        let fiber = el[fiberKey];
        for (let j = 0;j < 15; j++) {
          if (!fiber)
            break;
          const props = fiber.memoizedProps ?? fiber.pendingProps ?? {};
          if (isValidUri(props.uri))
            return props.uri;
          if (isValidUri(props.track?.uri))
            return props.track.uri;
          if (isValidUri(props.trackUri))
            return props.trackUri;
          if (isValidUri(props.item?.uri))
            return props.item.uri;
          if (isValidUri(props.data?.uri))
            return props.data.uri;
          if (isValidUri(props.model?.uri))
            return props.model.uri;
          if (Array.isArray(props.children)) {
            for (const child of props.children) {
              if (isValidUri(child?.props?.uri))
                return child.props.uri;
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
  function isPopoverOrNavigationButton(el) {
    if (!(el instanceof Element))
      return false;
    const text = (el.textContent ?? "").toLowerCase().trim();
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    const testId = (el.getAttribute("data-testid") ?? "").toLowerCase();
    const matchesWords = (str) => {
      return str === "done" || str === "cancel" || str === "close" || str === "dismiss" || str === "back";
    };
    return matchesWords(text) || matchesWords(ariaLabel) || matchesWords(testId) || ariaLabel.includes("done") || ariaLabel.includes("cancel") || ariaLabel.includes("close") || ariaLabel.includes("dismiss") || testId.includes("done") || testId.includes("cancel") || testId.includes("close");
  }
  function isRemovalButton(el) {
    if (!(el instanceof Element))
      return false;
    const testId = (el.getAttribute("data-testid") ?? "").toLowerCase();
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    const text = (el.textContent ?? "").toLowerCase();
    const isRemovalText = (str) => {
      return str.includes("remove") || str.includes("delete") || str.includes("unlike") || str.includes("dislike") || str.includes("dismiss");
    };
    if (testId === "added-button")
      return true;
    if (isRemovalText(testId) || isRemovalText(ariaLabel) || isRemovalText(text))
      return true;
    const fiberKey = Object.keys(el).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
    if (fiberKey) {
      let fiber = el[fiberKey];
      for (let depth = 0;fiber && depth < 8; depth++) {
        const props = fiber.memoizedProps ?? fiber.pendingProps;
        if (props) {
          const propsText = (props["aria-label"] ?? props.ariaLabel ?? props.label ?? props.text ?? "").toLowerCase();
          if (isRemovalText(propsText))
            return true;
          if (props.action === "remove" || props.mode === "remove")
            return true;
        }
        fiber = fiber.return;
      }
    }
    return false;
  }
  function isInPopupOrMenu(el) {
    if (!(el instanceof Element))
      return false;
    return !!el.closest("[role='dialog'], " + "[role='menu'], " + ".main-contextMenu-menu, " + ".main-modal-container, " + "[data-testid='add-to-playlist-menu'], " + ".sp-popover, " + ".popover");
  }
  function isLikeButton(el) {
    if (!(el instanceof Element))
      return false;
    if (isRemovalButton(el) || isPopoverOrNavigationButton(el))
      return false;
    const testId = el.getAttribute("data-testid") ?? "";
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    if (["heart-button", "save-button"].includes(testId))
      return true;
    if (testId.includes("heart") || testId.includes("save"))
      return true;
    if (ariaLabel.includes("save to your liked songs") || ariaLabel.includes("add to liked songs") || ariaLabel.includes("liked songs") || ariaLabel.includes("save to library") || ariaLabel === "like")
      return true;
    return false;
  }
  function isAddButton(el) {
    if (!(el instanceof Element))
      return false;
    if (isRemovalButton(el) || isPopoverOrNavigationButton(el))
      return false;
    const testId = el.getAttribute("data-testid") ?? "";
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    if (testId === "added-button")
      return false;
    if (ariaLabel.includes("remove from") || ariaLabel.includes("added to") || ariaLabel.includes("in your library"))
      return false;
    if (el.getAttribute("aria-checked") === "true")
      return false;
    if (testId.startsWith("add") || testId.includes("add-to-playlist"))
      return true;
    if (ariaLabel.includes("add to playlist") || ariaLabel.includes("add to your library") || ariaLabel.includes("save to your library") || ariaLabel.includes("add to your liked") || ariaLabel.includes("add to liked") || ariaLabel === "add")
      return true;
    if (/^(save|add) .+ to (your library|your liked songs|liked songs)$/.test(ariaLabel))
      return true;
    return false;
  }
  function isAlreadyAddedButton(el) {
    if (!(el instanceof Element))
      return false;
    const testId = el.getAttribute("data-testid") ?? "";
    const ariaLabel = (el.getAttribute("aria-label") ?? "").toLowerCase();
    if (testId === "added-button")
      return true;
    if (el.getAttribute("aria-checked") === "true" && testId.includes("add"))
      return true;
    if (ariaLabel.includes("remove from your library") || ariaLabel.includes("remove from your liked songs") || ariaLabel.includes("added to your library") || ariaLabel.includes("in your library") || ariaLabel.includes("remove from"))
      return true;
    return false;
  }
  function inspectFiberForButtonType(el) {
    if (!el)
      return null;
    const fiberKey = Object.keys(el).find((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
    if (!fiberKey)
      return null;
    let fiber = el[fiberKey];
    for (let depth = 0;fiber && depth < 8; depth++) {
      const type = fiber.type;
      if (type) {
        const name = type.name || type.displayName || "";
        if (name.includes("LikeButton") || name.includes("HeartButton") || name.includes("SaveButton") || name.includes("AddButton") || name.includes("AddToPlaylistButton") || name.includes("FeedbackButton")) {
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
        if (ariaLabel.includes("save to your liked songs") || ariaLabel.includes("add to liked songs") || ariaLabel.includes("add to your library") || ariaLabel.includes("save to your library") || ariaLabel.includes("add to playlist") || ariaLabel === "add" || ariaLabel === "like") {
          return "like-or-add";
        }
      }
      fiber = fiber.return;
    }
    return null;
  }
  function isSearchStyleSaveButton(el) {
    if (!(el instanceof Element))
      return false;
    const label = (el.getAttribute("aria-label") ?? "").toLowerCase();
    return /^(save|add) .+ to (your library|your liked songs|liked songs)$/.test(label);
  }
  var ADDED_CHECK_PATH = "M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m11.748-1.97a.75.75 0 0 0-1.06-1.06l-4.47 4.47-1.405-1.406a.75.75 0 1 0-1.061 1.06l2.466 2.467 5.53-5.53z";
  function markButtonAdded(el, targetUri) {
    try {
      el.dataset.rlAdded = targetUri;
      [...el.classList].filter((c) => c.endsWith("text-subdued")).forEach((c) => el.classList.remove(c));
      el.classList.add("encore-internal-color-text-bright-accent");
      const svg = el.querySelector("svg");
      const paths = svg ? svg.querySelectorAll("path") : [];
      if (paths.length) {
        svg.style.setProperty("--encore-icon-fill", "var(--text-bright-accent)");
        paths[0].setAttribute("d", ADDED_CHECK_PATH);
        for (let i = 1;i < paths.length; i++)
          paths[i].style.display = "none";
      }
    } catch (err) {
      console.warn(`[${EXT_NAME}] Could not update button state:`, err);
    }
  }

  // src/click-handler.js
  async function onDocumentClick(e) {
    if (!state.targetPlaylistUri)
      return;
    const button = e.target instanceof Element ? e.target.closest("button, [role='button']") : null;
    if (!button)
      return;
    if (button.dataset?.rlAdded && button.dataset.rlAdded === state.targetPlaylistUri) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    if (isAlreadyAddedButton(button) || isRemovalButton(button) || isPopoverOrNavigationButton(button) || isInPopupOrMenu(button))
      return;
    const isInNowPlaying = !!button.closest(NOW_PLAYING_SELECTOR);
    const isAdd = isAddButton(button);
    const isLike = isLikeButton(button);
    const isFiberLikeOrAdd = inspectFiberForButtonType(button) === "like-or-add";
    const isDetected = isAdd || isLike || isFiberLikeOrAdd;
    if (isInNowPlaying && isDetected) {
      const ariaChecked = button.getAttribute("aria-checked");
      if (ariaChecked === "true")
        return;
      const itemUri = Spicetify.Player.data?.item?.uri ?? null;
      if (!itemUri)
        return;
      e.stopImmediatePropagation();
      e.preventDefault();
      await withRedirectedLibraryAdd(() => addToTargetPlaylist(itemUri));
      return;
    }
    if (isDetected) {
      if (isLike && !isAdd && !state.preventLike)
        return;
      const ariaChecked = button.getAttribute("aria-checked");
      if (ariaChecked === "true")
        return;
      const itemUri = resolveTrackUri(button, false);
      if (!itemUri)
        return;
      e.stopImmediatePropagation();
      e.preventDefault();
      const added = await withRedirectedLibraryAdd(() => addToTargetPlaylist(itemUri));
      if (added && state.targetPlaylistUri && isSearchStyleSaveButton(button)) {
        markButtonAdded(button, state.targetPlaylistUri);
      }
      return;
    }
  }
  function installClickInterceptor() {
    document.addEventListener("pointerdown", onDocumentClick, { capture: true });
    document.addEventListener("mousedown", onDocumentClick, { capture: true });
    document.addEventListener("click", onDocumentClick, { capture: true });
    disposers.push(() => {
      document.removeEventListener("pointerdown", onDocumentClick, { capture: true });
      document.removeEventListener("mousedown", onDocumentClick, { capture: true });
      document.removeEventListener("click", onDocumentClick, { capture: true });
    });
  }

  // src/ui/confirm.js
  function showConfirmation(playlistName, playlistUri) {
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
      content
    });
    content.querySelector("#rl-confirm")?.addEventListener("click", async () => {
      const saved = await setTargetPlaylist(playlistUri, "Target playlist updated");
      if (saved)
        Spicetify.PopupModal.hide();
    });
    content.querySelector("#rl-cancel")?.addEventListener("click", () => {
      Spicetify.PopupModal.hide();
    });
  }

  // src/ui/picker.js
  async function showPlaylistPicker() {
    try {
      let extractPlaylists = function(items) {
        for (const item of items) {
          if (item.type === "playlist") {
            const uri = item.uri ?? "";
            if (!uri.startsWith("spotify:playlist:") || uri.includes("37i9dQZF"))
              continue;
            if (!isEditablePlaylist(item))
              continue;
            if (item.owner?.username === "spotify" || item.owner?.uri?.includes("spotify:user:spotify") || item.owner?.name === "Spotify")
              continue;
            playlists.push({ name: item.name, uri: item.uri });
          } else if (item.type === "folder" && item.items) {
            extractPlaylists(item.items);
          }
        }
      };
      const rootlist = await Spicetify.Platform.RootlistAPI.getContents();
      const playlists = [];
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
        content
      });
      const searchInput = content.querySelector("#rl-search");
      const topToggle = content.querySelector("#rl-top-toggle");
      const playlistItems = content.querySelectorAll(".rl-playlist-item");
      playlistItems.forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const uri = item.getAttribute("data-value");
          const name = item.querySelector("span").textContent;
          playlistItems.forEach((el) => el.classList.remove("rl-active"));
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
      searchInput?.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        playlistItems.forEach((el) => {
          const val = el.getAttribute("data-value");
          if (!val)
            return;
          const name = el.querySelector("span").textContent.toLowerCase();
          if (name.includes(query)) {
            el.style.display = "flex";
          } else {
            el.style.display = "none";
          }
        });
      });
      searchInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const rawVal = searchInput.value.trim();
          if (!rawVal)
            return;
          const pastedUri = normalizePlaylistUri(rawVal);
          if (pastedUri) {
            const found = playlists.find((pl) => pl.uri === pastedUri);
            const name = found ? found.name : "Custom Playlist";
            Spicetify.PopupModal.hide();
            setTimeout(() => showConfirmation(name, pastedUri), 200);
            return;
          }
          const firstVisible = Array.from(playlistItems).find((el) => el.style.display !== "none");
          if (firstVisible) {
            firstVisible.click();
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
      if (!raw)
        return;
      const uri = normalizePlaylistUri(raw);
      if (uri) {
        await setTargetPlaylist(uri, "Target playlist saved");
      } else {
        Spicetify.showNotification("That doesn't look like a valid playlist link", true);
      }
    }
  }

  // src/ui/icons.js
  var menuIcon = `<svg width="17" height="16" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;">
    <g transform="matrix(0.975851,0,0,0.976291,0,-2.121793)">
        <g transform="matrix(0.765482,0,0,0.88402,3.868865,1.179741)">
            <path d="M0.7,13.5L4.5,13.5C6.5,13.5 7.598,11.786 8.598,9.786C9.598,7.786 9.5,5.5 12.5,5.5L14.5,5.5" style="fill:transparent !important;stroke:currentColor !important;stroke-width:1.4px !important;" />
        </g>
        <g transform="matrix(1.119561,0,0,1.203772,-0.713632,-0.578892)">
            <path d="M12,3L14.5,5.5L12,8" style="fill:transparent !important;stroke:currentColor !important;stroke-width:1.2px !important;" />
        </g>
        <g transform="matrix(0.986407,0,0,1.024674,0.118385,1.495413)">
            <path d="M5.2,9.5C1.2,7 0.7,5 0.7,3.5C0.7,2.3 1.7,1.5 2.7,1.5C3.7,1.5 4.5,2.1 5.2,3C5.9,2.1 6.7,1.5 7.7,1.5C8.7,1.5 9.7,2.3 9.7,3.5C9.7,5 9.2,7 5.2,9.5Z" style="fill:transparent !important;stroke:currentColor !important;stroke-width:1.3px !important;" />
        </g>
    </g>
</svg>`;
  var targetIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"/><circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none"/></svg>`;
  var addIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.5v13M1.5 8h13"/></svg>`;
  var resetIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 0 1 9.5-3.8M13.5 8a5.5 5.5 0 0 1-9.5 3.8M2.5 4v4h4M13.5 12v-4h-4"/></svg>`;

  // src/menu.js
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
      console.error(`[${EXT_NAME}] Failed to register "${label}":`, err);
    }
  }
  function registerMenuItems() {
    registerItem(new Spicetify.Menu.Item("Redirect Likes Settings", false, showPlaylistPicker, menuIcon));
    registerItem(new Spicetify.ContextMenu.Item("Set as Redirect Likes target", async (uris) => {
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
    }, (uris) => {
      const uri = uris?.[0] ?? "";
      return uri.startsWith("spotify:playlist:") && !uri.includes("37i9dQZF");
    }, targetIcon));
    registerItem(new Spicetify.ContextMenu.Item("Redirect Likes to target playlist", async (uris) => {
      const uri = uris?.[0];
      if (!isPlayableUri(uri)) {
        Spicetify.showNotification("This only works on tracks or playable items", true);
        return;
      }
      await addToTargetPlaylist(uri);
    }, (uris) => {
      const uri = uris?.[0];
      return isPlayableUri(uri);
    }, addIcon));
    registerItem(new Spicetify.ContextMenu.Item("Reset Redirect Likes to Liked Songs", () => {
      state.targetPlaylistUri = "";
      resetValidityCache();
      persist();
      Spicetify.showNotification("Playlist reset!");
    }, (uris) => {
      const uri = uris?.[0] ?? "";
      return !!state.targetPlaylistUri && uri.startsWith("spotify:playlist:") && !uri.includes("37i9dQZF");
    }, resetIcon));
  }

  // src/api.js
  function exposeApi() {
    window.RedirectLikes = {
      async configure() {
        const raw = prompt([
          "Paste the target playlist URL or URI.",
          "",
          "  URL example : https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
          "  URI example : spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
        ].join(`
`));
        if (!raw)
          return;
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
        Spicetify.showNotification(`Liked Songs saving ${state.preventLike ? "disabled" : "enabled"}`);
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
      }
    };
  }

  // src/index.js
  (async function RedirectLikes() {
    if (globalThis.RedirectLikes?.dispose) {
      globalThis.RedirectLikes.dispose();
    }
    while (typeof globalThis.Spicetify === "undefined" || !globalThis.Spicetify?.showNotification || !globalThis.Spicetify?.Platform?.PlaylistAPI || !globalThis.Spicetify?.Player || !globalThis.Spicetify?.LocalStorage || !globalThis.Spicetify?.ContextMenu || !globalThis.Spicetify?.Menu || !globalThis.Spicetify?.PopupModal || !globalThis.Spicetify?.Platform?.RootlistAPI) {
      await new Promise((r) => setTimeout(r, 500));
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
})();
