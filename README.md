<div align="center">

```
░▒▓ PVANK ▓▒░
verzegel deze pagina
```

**One-click cryptographic proof from your browser.**
**Eén klik, cryptografisch bewijs van wat je nu ziet.**

[![License](https://img.shields.io/badge/License-AGPL_3.0-FF6B35?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.3.0-0b7fdb?style=flat-square)](https://github.com/WimLee115/pvank-extension/releases)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-00FF41?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3)
[![Chrome](https://img.shields.io/badge/Chrome-Edge-0b7fdb?style=flat-square)](#installatie)
[![Firefox](https://img.shields.io/badge/Firefox-MV3-7C3AED?style=flat-square)](#installatie)
[![NL · EN](https://img.shields.io/badge/i18n-NL_·_EN-FF4500?style=flat-square)](#talen)
[![Privacy First](https://img.shields.io/badge/Privacy-First-00FF41?style=flat-square)](#privacy)

[Nederlands](#nederlands) · [English](#english)

</div>

---

## Nederlands

> _"De taal waarin bedrijven niet kunnen liegen."_

**PVANK Extensie** verankert digitaal bewijs in de Bitcoin-blockchain — vanuit de pagina die je nu open hebt, **inclusief de ingelogde versie**. Voor de burger die ooit moet bewijzen wat een instantie écht zei, schreef of toonde — voordat het verdwijnt.

### Wat dit doet

Eén klik op de PVANK-knop → de extensie verzegelt **deze pagina, zoals jij hem ziet**, en levert binnen seconden een lokale `pvank-bewijs.zip` met:

```
pvank-bewijs.zip
├── snapshot.html       — exacte HTML zoals jouw browser hem rendert
├── snapshot.png        — screenshot van het zichtbare deel
├── headers.json        — URL · titel · viewport · user-agent · taal
├── manifest.json       — alle SHA-256-hashes + tijdstempel + canoniek-digest
├── manifest.json.ots   — OpenTimestamps-receipt (Bitcoin-blockchain)
└── verify.html         — open in elke browser om alles te controleren
```

`verify.html` werkt **offline en zonder PVANK**. Drop de bestanden erin → SHA-256 wordt opnieuw berekend en vergeleken met het manifest. Voor blockchain-verificatie:

```bash
pip install opentimestamps-client
ots upgrade  manifest.json.ots   # over ~1 uur, na volgend Bitcoin-blok
ots verify   manifest.json.ots --file manifest.json
```

### Waarom een extensie naast pvank.nl?

|  | webapp ([pvank](https://github.com/WimLee115/pvank)) | extensie (dit project) |
|---|---|---|
| **Toegang** | anonieme fetch van publieke URL | jouw geauthenticeerde sessie |
| **Login** | nee | **ja — MijnGemeente · MijnUWV · BKR · banking** |
| **Server-side** | WHOIS · DNS · TLS · KvK-hints | — (zie roadmap) |
| **Werkt op** | alles met URL | enkel actieve tab |
| **Privacy** | gegevens passeren server | 100% lokaal |

De webapp en de extensie zijn complementair. Beide produceren hetzelfde `pvank-bewijs.zip`-formaat met dezelfde `verify.html`.

### Privacy

- **100% client-side**. Alleen de SHA-256-digest van `manifest.json` (32 bytes) wordt naar OpenTimestamps-calendars verzonden.
- **Geen telemetrie, geen tracking, geen externe services** behalve `*.opentimestamps.org`.
- De snapshot blijft op jouw schijf.
- Open source · AGPL-3.0 · auditeerbaar.
- Geschiedenis (laatste 20) wordt enkel **lokaal** in `chrome.storage.local` bewaard — alleen URL/digest/tijdstempel, geen bestandsinhoud. Uit te zetten in instellingen.

### Talen

Volledig vertaald, automatische detectie via browser-taal, override via instellingen:

- 🇳🇱 Nederlands
- 🇬🇧 English

### Installatie

#### Vanaf bron (development)

```bash
git clone https://github.com/WimLee115/pvank-extension.git
cd pvank-extension
npm install
npm run build
```

**Chrome / Edge / Brave**

```
chrome://extensions  →  Developer mode AAN  →  Load unpacked  →  dist-chrome/
```

**Firefox**

```
about:debugging#/runtime/this-firefox  →  Load Temporary Add-on  →  dist-firefox/manifest.json
```

#### Permanente installatie (toekomst)

Submit-builds via `npm run package` (zip-bestanden in `releases/`). Distributie via Chrome Web Store en addons.mozilla.org volgt zodra v1.0 stable is.

### Gebruik

1. Navigeer naar de pagina die je wilt verzegelen — **log eerst in indien nodig**
2. Klik het PVANK-icoontje (rechtermuisknop op de pagina werkt ook: *Verzegel deze pagina*)
3. Klik **▒▒ ANKER NEERLATEN ▒▒**
4. Wacht ~5–10 sec → `pvank-bewijs_<host>_<timestamp>.zip` wordt gedownload
5. Bewaar de zip op een veilige plek (cloud-backup, USB, externe schijf)

### Architectuur

```
src/
├── popup/                 ← UI · drijft de seal-flow aan
│   ├── index.html
│   ├── main.ts
│   └── style.css
├── options/               ← instellingen-pagina (taal · geschiedenis)
├── background.ts          ← service worker · enkel context-menu
├── content.ts             ← injected · grijpt de DOM uit de pagina
├── manifest.base.json     ← gedeelde manifest (chrome+firefox)
└── lib/
    ├── seal.ts            ← orkestratie: DOM → screenshot → hash → OTS → zip
    ├── capture.ts         ← chrome.tabs.captureVisibleTab → PNG
    ├── hash.ts            ← SHA-256 via crypto.subtle (browser-native)
    ├── manifest.ts        ← canoniek-JSON + digest van het bewijs
    ├── ots.ts             ← OpenTimestamps calendar-protocol (3 fallbacks)
    ├── bundle.ts          ← JSZip → URL.createObjectURL → <a download>
    ├── history.ts         ← chrome.storage.local · laatste 20 entries
    ├── i18n.ts            ← NL · EN dictionary met chrome.storage.sync
    └── types.ts
```

Build-tooling: Vite + TypeScript strict. Eén codebase → twee dist-mappen (`dist-chrome/` en `dist-firefox/`).

### Bekende beperkingen (v0.2)

- **Screenshot is alleen viewport** — niet full-page. v0.3 plant `chrome.debugger.captureScreenshot({ captureBeyondViewport: true })` voor Chromium en `browser.tabs.captureTab` voor Firefox.
- **HTTP response-headers ontbreken** — MV3 declarativeNetRequest verbiedt response-inspectie zonder uitgebreide permissies. Voor headers: gebruik de PVANK-webapp.
- **`tegenpartij.json`** (WHOIS / DNS / TLS / KvK / BTW / IBAN) ontbreekt — vereist een server. v0.3 plant optioneel relais via zelf-hostbare PVANK-instance.
- **Context-menu opent popup alleen op Chromium 127+** (`chrome.action.openPopup`). Firefox-users gebruiken het toolbar-icoon.

### Roadmap

- **v0.3** — full-page screenshots · `tegenpartij.json` via PVANK-relais
- **v0.4** — selectie-mode (verzegel alleen geselecteerd DOM-element)
- **v0.5** — keyboard shortcut · meerdere tabs in één bewijs
- **v1.0** — Chrome Web Store · addons.mozilla.org · signed releases

### Licentie

AGPL-3.0-or-later. Zie [LICENSE](LICENSE).

### Verwante projecten

- [pvank](https://github.com/WimLee115/pvank) — de oorspronkelijke webapp
- [OpenTimestamps](https://opentimestamps.org) — het anker-protocol

---

## English

> _"The language companies cannot lie in."_

**PVANK Extension** anchors digital evidence in the Bitcoin blockchain — from the page you have open right now, **including the logged-in version**. For the citizen who one day needs to prove what an institution actually said, wrote, or showed — before it disappears.

### What it does

One click on the PVANK button → the extension seals **this page, as you see it**, and produces a local `pvank-bewijs.zip` within seconds:

```
pvank-bewijs.zip
├── snapshot.html       — exact HTML as your browser rendered it
├── snapshot.png        — screenshot of the visible area
├── headers.json        — URL · title · viewport · user-agent · language
├── manifest.json       — all SHA-256 hashes + timestamp + canonical digest
├── manifest.json.ots   — OpenTimestamps receipt (Bitcoin blockchain)
└── verify.html         — open in any browser to verify everything
```

`verify.html` works **offline and without PVANK**. Drop the files into it → SHA-256 is recomputed and compared against the manifest. For blockchain verification:

```bash
pip install opentimestamps-client
ots upgrade  manifest.json.ots   # ~1 hour later, after the next Bitcoin block
ots verify   manifest.json.ots --file manifest.json
```

### Why an extension alongside pvank.nl?

|  | webapp ([pvank](https://github.com/WimLee115/pvank)) | extension (this project) |
|---|---|---|
| **Access** | anonymous fetch of public URL | your authenticated session |
| **Login** | no | **yes — bank statements · gov portals · email** |
| **Server-side** | WHOIS · DNS · TLS · entity hints | — (see roadmap) |
| **Works on** | anything with a URL | only the active tab |
| **Privacy** | data passes through server | 100% local |

The webapp and the extension are complementary. Both produce the same `pvank-bewijs.zip` format with the same `verify.html`.

### Privacy

- **100% client-side**. Only the SHA-256 digest of `manifest.json` (32 bytes) is sent to OpenTimestamps calendars.
- **No telemetry, no tracking, no third-party services** other than `*.opentimestamps.org`.
- The snapshot stays on your disk.
- Open source · AGPL-3.0 · auditable.
- History (last 20) is stored **locally only** in `chrome.storage.local` — URL/digest/timestamp only, never file contents. Disable in settings.

### Languages

Fully translated, auto-detected from browser language, override in settings:

- 🇳🇱 Dutch
- 🇬🇧 English

### Install

#### From source (development)

```bash
git clone https://github.com/WimLee115/pvank-extension.git
cd pvank-extension
npm install
npm run build
```

**Chrome / Edge / Brave**

```
chrome://extensions  →  Developer mode ON  →  Load unpacked  →  dist-chrome/
```

**Firefox**

```
about:debugging#/runtime/this-firefox  →  Load Temporary Add-on  →  dist-firefox/manifest.json
```

### Use

1. Navigate to the page you want to seal — **log in first if needed**
2. Click the PVANK toolbar icon (or right-click → *Seal this page*)
3. Click **▒▒ DROP ANCHOR ▒▒**
4. Wait ~5–10 sec → `pvank-bewijs_<host>_<timestamp>.zip` is downloaded
5. Store the zip in a safe place (cloud backup, USB, external drive)

### Roadmap

- **v0.3** — full-page screenshots · `tegenpartij.json` via PVANK relay
- **v0.4** — selection mode (seal only a selected DOM element)
- **v0.5** — keyboard shortcut · multi-tab proofs
- **v1.0** — Chrome Web Store · addons.mozilla.org · signed releases

### License

AGPL-3.0-or-later. See [LICENSE](LICENSE).

### Related projects

- [pvank](https://github.com/WimLee115/pvank) — the original webapp
- [OpenTimestamps](https://opentimestamps.org) — the anchoring protocol
