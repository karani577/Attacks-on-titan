# Titan Gear: ODM Trials

A mobile-friendly browser 3D action-game prototype inspired by anime titan-hunting and ODM traversal. It uses Three.js from a public CDN and does not require a build step.

## Publish on GitHub Pages (iPad-friendly)

1. Create a new repository on GitHub, for example `titan-gear`.
2. Upload **all four files** from this folder (`index.html`, `style.css`, `game.js`, and `README.md`) to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**, choose `main` and `/(root)`, then Save.
5. Wait for GitHub Pages to publish, then open the URL shown on that Pages settings screen.

The Three.js module is loaded from jsDelivr, so the game requires an internet connection. Do not open `index.html` directly from the Files app; use GitHub Pages or another static web host so JavaScript modules load correctly.

## Controls

### Desktop
- **WASD / arrow keys**: move
- **Mouse movement**: rotate camera (double-click the game to request pointer lock)
- **E** or right-click: hook / release
- **Left-click** or **F**: slash
- **Space**: jump
- **Shift**: boost (uses gas)
- **Escape**: pause / resume

### Touch devices
Use the on-screen movement pad and Hook, Slash, Boost, Jump buttons. Drag across the game view to rotate the camera.

## Included prototype systems

- 3D lobby with station dialogue, plus Free Play, AFK Zone and four 40-kill missions
- ODM-style hook pull, momentum, jumping, boost and gas meter
- Titans with health, contact damage, slash combat and kill rewards
- Gear spin shop with ten gear names and seven rarity colors
- Gear rarity forge, gear tier upgrades, duplicate merge
- Direct upgrades for damage, movement speed, critical damage/chance, hook range and gas capacity
- Luck, Damage and Health skill routes
- Personal stats, callsign, uniform color, local save, and save export
- Mission completion report with kills, gold, forge tokens, time, replay and lobby buttons

## Important limitations

This is a **playable prototype**, not a finished commercial game. Physics are an original approximation, not copied proprietary AOTR or UAOT code. Saves are local to the browser/device; there is no real online account, server validation, cross-device cloud save, or global leaderboard. AFK rewards accrue only while the page remains open. The leaderboard entry explains this limitation. The project has not been exhaustively tested across all devices, and external CDN availability is required.

## If the game does not load

- Confirm all files are at the repository root with exact filenames.
- Open the published GitHub Pages URL, not the GitHub file preview.
- Refresh once the Pages deployment finishes.
- Check your internet connection because Three.js is loaded from jsDelivr.
