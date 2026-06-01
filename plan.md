# 弾幕縦スクロールゲーム 開発計画

## 1. ゲーム概要

縦スクロール型の弾幕シューティングゲームを作る。プレイヤーは画面下側からスタートし、ステージは常に上方向へ進んでいるように見せる。プレイヤーは前方、つまり上方向にしか攻撃できない。

実装名は **Vertical Bullet Garden** とする。

## 2. MVP仕様

- 画面は縦長 Canvas。
- プレイヤーは矢印キーで上下左右に移動する。
- `Shift` で低速移動する。
- `Z` で上方向にショットを撃つ。
- 背景は下方向へループスクロールする。
- 敵は画面上部から出現する。
- 敵弾は直線弾、自機狙い弾、円形弾、扇状弾を使う。
- プレイヤー弾が敵やボスに当たるとダメージを与える。
- 敵弾がプレイヤー中心の小さな当たり判定に当たるとHPが減る。
- HPが0になるとゲームオーバー。
- 一定時間後にボスへ移行し、ボス撃破でゲームクリア。

## 3. 操作方法

| キー | 動作 |
| --- | --- |
| ↑ ↓ ← → | 移動 |
| Z | 上方向ショット |
| Shift | 低速移動 / 当たり判定表示 |
| Enter | スタート |
| Esc | ポーズ |

## 4. ゲーム状態

- `title`
- `playing`
- `boss`
- `game_clear`
- `game_over`
- `pause`

状態ごとに入力、更新、描画の扱いを分ける。

## 5. データ構造

- `player`: x, y, speed, slowSpeed, hp, invuln, shotCooldown
- `playerBullets`: x, y, vx, vy, radius, damage
- `enemyBullets`: x, y, vx, vy, radius, color
- `enemies`: x, y, vx, vy, hp, radius, score, shootTimer, type
- `boss`: x, y, hp, maxHp, phase, attackTimer, radius
- `game`: mode, score, time, player, bullets, enemies, boss, background, particles

## 6. 実装済み

- 縦長ゲーム画面。
- キーボード操作。
- `Z` キーの上方向ショット。
- `Shift` 低速移動。
- 低速移動中の小さな当たり判定表示。
- 縦スクロール背景。
- 敵A、敵B、敵Cの簡易実装。
- プレイヤー弾と敵の当たり判定。
- 敵弾とプレイヤーの当たり判定。
- HP、スコア、ステージ状態表示。
- 一定時間後のボス戦。
- ボスHPバー。
- ボス撃破によるゲームクリア。
- HP0によるゲームオーバー。
- Escポーズ。

## 7. 開発環境

- `node tools/dev-server.mjs`: 依存なしのローカルサーバー。
- `node tools/smoke-test.mjs`: 依存なしのスモークテスト。
- `npm run dev` / `npm test`: npm が使える環境向けのショートカット。
- Codex in-app Browser / Playwright-style browser checks で表示確認する。

## 8. OpenAI Docs Decision

OpenAI APIキーはブラウザ側コードに置かない。OpenAI公式の Authentication docs は、APIキーをブラウザやアプリのクライアント側コードに露出しないよう案内している。AI要素を追加する場合は、サーバー側の環境変数からAPIキーを読み込む。

Reference: https://developers.openai.com/api/reference/overview#authentication

## 9. 次に追加したい要素

- パワーアップアイテム。
- ボム。
- ステージ2以降。
- BGMと効果音。
- 弾消し演出。
- スコアランキング。
- 難易度選択。
- スマホ対応。
