# RedirectLikes

Spicetify extension that redirects the Like button and "Add to Playlist" (+) to a playlist of your choice.

## Install

1. Download `dist/redirect-likes.js`
2. Put it in your Spicetify Extensions folder:
   - Windows: `%appdata%\spicetify\Extensions\`
   - Linux / macOS: `~/.config/spicetify/Extensions/`
3. Run:
   ```
   spicetify config extensions redirect-likes.js
   spicetify apply
   ```

## Develop

```
npm install
npm run build      # -> dist/redirect-likes.js (readable)
```

Edit files in `src/`. Never edit `dist/`.

```
src/
├── index.js           entry point: wires everything together
├── constants.js       names, config keys, timings, selectors
├── state.js           shared settings + LocalStorage load/save
├── utils.js           small helpers (URI parsing, HTML escaping)
├── playlist.js        add to target playlist / Liked Songs, validity checks
├── library-patch.js   redirects Spotify's LibraryAPI.add
├── dom-detection.js   works out which button was clicked and which track it belongs to
├── click-handler.js   capture-phase click interception
├── menu.js            profile menu + right-click menu items
├── api.js             console API (window.RedirectLikes)
├── styles.css         all styling
└── ui/
    ├── styles.js      injects styles.css into the page
    ├── picker.js      playlist picker modal
    ├── confirm.js     confirmation modal
    └── icons.js       SVG icons
```
