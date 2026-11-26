# Café Desktop

The Café studios in their own window: offline, with no calls to Google or anyone else, reading and writing a
**Cafe Data** folder that lives on the thumb drive next to the program.

Inside: Café Studio Bayes, the Cafe Dynamics Studio, Café Code Lab, and a home page that lists your saved
projects and any extra pages you drop into the drive.

## 1. Build it once

The build needs an internet connection once, to fetch Electron (the Chromium engine in a window). The finished
program never goes online.

**Easiest: let GitHub build all three versions.** Put this folder in a GitHub repository, open the
**Actions** tab, choose **Build Café**, press **Run workflow**, and after about ten minutes download the
three files from the run's *Artifacts*.

**Or build on your own computer.** Install Node.js 20 (nodejs.org), open a terminal in this folder, and run:

```
npm install
npm test                 # checks the file-safety rules
npm start                # try it in a window
npm run dist:win         # on Windows  → dist/Cafe for Windows.exe
npm run dist:mac         # on a Mac    → dist/Cafe for Mac (x64).zip and (arm64).zip
npm run dist:linux       # on Linux    → dist/Cafe for Linux.AppImage
```

Each operating system's version is built on that system (or by the GitHub workflow, which uses all three).

## 2. Lay out the drive

```
CAFE  (the thumb drive)
├── Cafe for Windows.exe
├── Cafe for Mac/Cafe.app          unzip the arm64 zip for Apple Silicon, the x64 zip for Intel Macs
├── Cafe for Mac/fix-mac.command   from extras/, in case macOS refuses to open the app
├── Cafe for Linux.AppImage
├── Cafe Data/                     made on first launch
│   ├── Projects/                  project zips saved from Café Studio Bayes
│   ├── Data/                      CSV, JSON and text files
│   ├── Downloads/                 reports, saved lessons, everything else
│   ├── Apps/                      drop any standalone .html page here: it appears on the home page
│   └── .profile/                  the window's memory (remembered tabs, edited lessons)
└── Plain HTML/                    the same studios as plain files (included in this kit), for any browser
```

Format the drive as **exFAT** so Windows, macOS and Linux can all read and write it.

## 3. First launch on each kind of computer

- **Windows**: double-click *Cafe for Windows.exe*. SmartScreen may warn about an unknown publisher:
  *More info* → *Run anyway*. It starts a little slowly from a USB drive because it unpacks itself first.
- **Mac**: open *Cafe for Mac*, right-click *Cafe.app* → *Open* → *Open*. If macOS says the app is damaged,
  double-click *fix-mac.command* once. Works on Apple Silicon and Intel Macs.
- **Linux**: mark the AppImage as executable (right-click → Properties → Permissions, or
  `chmod +x "Cafe for Linux.AppImage"`) and double-click it.

The programs are not signed with a paid certificate, hence the one-time warnings. A college IT department
can sign them if wanted.

## 4. How it stays offline

Three separate walls, any one of which is enough:

1. Every web address fails to resolve (`host-resolver-rules: MAP * ~NOTFOUND`), and Chromium's background
   services (updates, component downloads, pings, spell-check dictionaries) are switched off.
2. Every request that is not to the app's own pages (`cafe://`) or local data is cancelled before it leaves,
   and counted: the home page shows "N outside requests blocked" if anything ever tried.
3. The pages carry a content policy that allows connections only to the app itself.

To see for yourself: **View → Developer tools (under the hood)** → *Network* tab. Fonts are the computer's
own; the Google font links were removed from the studios.

Links to web pages (in a lesson's notes, say) are never opened silently: a dialog offers to copy the address
or, if you choose, open it in your usual browser.

## 5. Files

- Saving a project, report or lesson from any studio opens a save dialog already pointed at the right
  folder in *Cafe Data*.
- Opening files (data CSVs, project zips, stock-and-flow diagrams) uses each studio's own Open buttons,
  which show the computer's normal file dialog; *Cafe Data* is the place to look.
- The pages can reach only the *Cafe Data* folder through the app (list, read, write, show in
  Explorer or Finder), and only through four named requests in `preload.js`. Paths that try to climb out
  of the folder are refused (see `paths.js` and `test/paths.test.js`).

## 6. Updating a studio

Replace the file in `app/apps/` and rebuild. For a quick change without rebuilding, put the new page in
*Cafe Data/Apps*: it appears under "Your own pages" on the home page.

## What is where

| File | What it does |
|---|---|
| `main.js` | starts the window, serves the pages at `cafe://`, blocks the network, places saves in Cafe Data, builds the menu |
| `preload.js` | the four requests a page may make of the drive |
| `paths.js` | where the drive is, and the rules that keep paths inside Cafe Data |
| `app/index.html` | the home page |
| `app/apps/` | the three studios, exactly as in their standalone versions minus the Google font links |
| `.github/workflows/build.yml` | builds all three versions on GitHub |
| `extras/fix-mac.command` | one-click repair for macOS's quarantine and signing checks |
