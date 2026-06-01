# Work Log: Danmaku Shooter MVP

## Summary

- Reworked the existing browser game into a vertical scrolling bullet-hell shooter MVP named `Vertical Bullet Garden`.
- Updated the plan to match the user's Japanese development plan.
- Kept the no-dependency development environment.

## Implemented

- Tall Canvas stage.
- Arrow-key movement.
- `Z` upward-only shooting.
- `Shift` focus movement and visible hitbox.
- Scrolling starfield background.
- Enemy waves from the top of the screen.
- Enemy A/B/C behavior variants.
- Player bullets, enemy bullets, aimed bullets, circle bullets, and fan bullets.
- Collision checks for player bullets vs enemies/boss and enemy bullets/enemies vs player.
- HP, score, stage state, boss HP bar, pause, game over, and game clear.

## Verification Plan

- Ran `node tools/smoke-test.mjs`: passed.
- Opened `http://127.0.0.1:5173/` in the browser.
- Started with the button.
- Sent `Z`, arrow, and `Shift` key events.
- Confirmed no browser console errors.
- Reduced the game shell width so the vertical stage is easier to inspect in the default desktop viewport.
