# Titan Gear: ODM Trials — Enhanced Update

This is an updated set of the existing browser game files for the `karani577/Attacks-on-titan` repository. It keeps the original lobby, gear spin shop, rarity forge, direct upgrades, skill routes, stats/save export, custom uniform, Free Play, AFK Zone, and four 40-kill missions.

## What's changed
- Larger, more detailed low-poly Titans with visible facial features, muscle definition, nape marker, and improved scale.
- Titans spawn slightly farther away than in the original version.
- Improved lighting, fog, procedural ground texture, atmospheric depth, terrain props, city windows, and material response.
- Mobile-friendly renderer settings (reduced pixel ratio and no real-time shadow map on touch devices) to protect performance.
- Input profile detects touch devices, keyboard/mouse, and connected Gamepads. A console browser can only be identified reliably when its user-agent exposes the platform or a controller is detected.
- A dedicated mission UI state: lobby HUD and navigation disappear. Missions show a small top objective/status strip, a compact control guide at bottom-left, and combat skills at bottom-right.
- Combat skills: `1` Burst dash, `2` Pulse area strike, `3` Execute empowered slash; buttons are also clickable.
- Fixed mission spawning so 40-kill missions can keep replenishing Titans until the objective is complete.

## Controls
### Mobile / touch
Use the on-screen directional pad to move, drag the game view to look, and tap Hook, Slash, Boost, or Jump. The three combat skills are in the lower-right panel.

### PC
- WASD / arrow keys: move
- Mouse: look around; double-click the view to request pointer lock
- E or right mouse button: hook / release
- Left mouse button or F: slash
- Space: jump
- Shift: boost (uses gas)
- 1 / 2 / 3: combat skills
- Escape: pause / resume

### Controller / console browser
- Left stick: move; right stick: camera
- A / bottom face button: jump
- B / east face button: hook
- X / west face button: slash
- Y / north face button: Burst; LB: Pulse; RB: Execute
- LT or RT: boost (controller mapping varies by browser/controller)
- Start: pause / resume

## Install on GitHub Pages from an iPad
1. Open the repository in Safari: https://github.com/karani577/Attacks-on-titan
2. Replace the existing `index.html`, `style.css`, `game.js`, and `README.md` with the four files from this update. Keep the exact filenames and place them in the repository root.
3. Commit the changes to the `main` branch.
4. If GitHub Pages is already enabled, wait for the deployment to finish. Open the Pages URL; you normally do not need to publish a GitHub Release.
5. If Pages is not enabled, open **Settings → Pages**, select **Deploy from a branch**, choose `main` and `/(root)`, then Save.

The game loads Three.js from jsDelivr, so an internet connection is required. Open the published Pages website rather than the GitHub file preview or the Files app.

## Prototype limitations
This remains a client-side prototype. Progress is stored locally in the browser on the current device; there is no server, multiplayer, cloud save, or online leaderboard. Browser-based console identification is not guaranteed on all console browsers; connected Gamepad detection is the reliable fallback.
