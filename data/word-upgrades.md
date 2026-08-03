# Word Upgrade Sheet

`word-upgrades.csv` をExcelやGoogle Sheetsで編集すると、コードを書かずに単語強化を調整できます。

列:

- `word`: 判定する単語
- `type`: `attack` 炎 / `mobility` 風 / `control` 氷 / `life` 光 / `pattern` 闇 / `defense` 守り
- `label`: 画面に出る短い分類名
- `power`: 強さ。空欄なら文字数から自動計算
- `title`: 強化カード名。空欄なら自動生成
- `description`: 強化説明。空欄なら属性ごとの標準説明
- `highRoll`: `true` なら大当たり単語
- `source`: 管理元メモ。通常は `sheet`

Google Sheetsで編集する場合は、CSVとしてダウンロードしてこのファイル名で上書きしてください。
