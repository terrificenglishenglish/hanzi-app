# 汉字 Тренажёр

Мини-приложение в Telegram для китайских слов из уроков Насти.

- `index.html` — само приложение (карточки, уроки, тексты, игры, письмо, тест)
- `data/words.js` — уроки и слова, `data/texts.js` — тексты, `data/chars.js` — значения иероглифов, `data/strokes.js` — черты
- `audio/` — озвучка (mp3), `data/audio.js` — список готовых файлов
- `tools/make_audio.py` — дозаписать озвучку для новых слов
- `.github/workflows/remind.yml` — ежедневное напоминание в Telegram

Прогресс хранится в облаке Telegram (CloudStorage), поэтому одинаков на телефоне и компьютере.

Черты: [Hanzi Writer](https://hanziwriter.org), данные [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) (Arphic Public License).
