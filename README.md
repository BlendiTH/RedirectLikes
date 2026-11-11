<p align="center">
  <img src="https://github.com/user-attachments/assets/f957ed0f-0026-4aec-8eba-d4788e7930cc" alt="RedirectLikes — Send Spotify's Like button to any playlist" width="100%">
</p>

<p align="center"><b>Redirect Spotify's Like button to any playlist, instead of Liked Songs.</b></p>

<p align="center">
  <img alt="Spicetify extension" src="https://img.shields.io/badge/Spicetify-extension-1DB954?logo=spotify&logoColor=white">
  <img alt="JavaScript ES modules" src="https://img.shields.io/badge/JavaScript-ES%20modules-F7DF1E?logo=javascript&logoColor=black">
  <img alt="Built with Bun" src="https://img.shields.io/badge/Built%20with-Bun-000000?logo=bun&logoColor=white">
  <img alt="License" src="https://img.shields.io/github/license/BlendiTH/RedirectLikes">
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#install-optional">Install</a> ·
  <a href="#build-from-source">Build</a> ·
  <a href="#limitations">Limitations</a>
</p>

---

## What is RedirectLikes?

Spotify's heart button only ever saves to **Liked Songs**. RedirectLikes is a [Spicetify](https://spicetify.app) extension that sends it, and the **+** button, to any playlist you pick.

> Built for my own use and refined privately over several months before I made it public.

## Features

- Likes from tracklists and the now-playing bar go to your chosen playlist
- Playlist picker with search or paste-a-link, and an add-to-top/bottom toggle
- Right-click menu to set the target playlist or reset to Liked Songs
- Falls back to Liked Songs if the target playlist is deleted or read-only

## How it works

- Catches clicks before Spotify's own handlers and works out which button was pressed, using DOM attributes and React fiber inspection.
- Temporarily patches `LibraryAPI.add` so Spotify's own like call is redirected only while a redirect is in flight.
- Written as small ES modules plus a separate CSS file, bundled into one file with Bun, since Spicetify loads a single `.js`.

## Install (optional)

This repo is mainly a showcase, but you're welcome to use it. You need [Spicetify](https://spicetify.app) installed.

Download `dist/redirect-likes.js` from this repo _(open it on GitHub and use the download button or **Raw**)_, then in PowerShell:

```powershell
Copy-Item redirect-likes.js "$env:APPDATA\spicetify\Extensions\"
spicetify config extensions redirect-likes.js
spicetify apply
```

Or download it directly:

```powershell
Invoke-WebRequest "https://raw.githubusercontent.com/BlendiTH/RedirectLikes/main/dist/redirect-likes.js" -OutFile "$env:APPDATA\spicetify\Extensions\redirect-likes.js"
spicetify config extensions redirect-likes.js
spicetify apply
```

On Linux and macOS the Extensions folder is `~/.config/spicetify/Extensions/`.

**Usage:** click your profile icon, then **Redirect Likes Settings**, to pick your target playlist and choose whether songs are added to the top or the bottom of it. You can also right-click any playlist and choose **Set as Redirect Likes target**.

## Build from source

Requires [Bun](https://bun.sh):

```
bun run build
```

This bundles `src/` into `dist/redirect-likes.js`.

## Limitations

- Only playlists you can add to (your own and collaborative ones) are listed.
- In search results, clicking the button again won't let you change or remove a song after adding it. Use Spotify's right-click menu on the track instead. **Everywhere else, clicking the button again works as normal.**
- It relies on Spotify's internal page structure, so a Spotify update can break it.
- Developed and tested on Windows.

## License

See [LICENSE](LICENSE).
