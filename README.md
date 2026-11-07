![RedirectLikes](https://github.com/user-attachments/assets/f957ed0f-0026-4aec-8eba-d4788e7930cc)
# RedirectLikes

A [Spicetify](https://spicetify.app) extension that redirects Spotify's **Like** (heart) and **Add to Playlist** (+) buttons to a playlist of your choice, instead of Liked Songs.
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

Copy-Item redirect-likes.js "$env:APPDATA\\spicetify\\Extensions\\"

spicetify config extensions redirect-likes.js

spicetify apply

```

Or download it directly:

```powershell

Invoke-WebRequest "https://raw.githubusercontent.com/BlendiTH/RedirectLikes/main/dist/redirect-likes.js" -OutFile "$env:APPDATA\\spicetify\\Extensions\\redirect-likes.js"

spicetify config extensions redirect-likes.js

spicetify apply

```

On Linux and macOS the Extensions folder is `\~/.config/spicetify/Extensions/`.

**Usage:** click your profile icon, then **Redirect Likes Settings**, to pick your target playlist and choose whether songs are added to the top or the bottom of it. You can also right-click any playlist and choose **Set as Redirect Likes target**.

## Build from source

Requires [Bun](https://bun.sh): `bun run build` bundles `src/` into `dist/redirect-likes.js`.
