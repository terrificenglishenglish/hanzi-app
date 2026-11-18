"""Generate missing natural Chinese audio and update the packed web assets.

Run from the repository root after installing ``edge-tts``::

    python3 tools/update_audio.py
"""

import asyncio
import base64
import json
import os
import re
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
VOICE = os.environ.get("VOICE", "zh-CN-XiaoxiaoNeural")


def js_const(path: Path, name: str):
    source = path.read_text(encoding="utf-8")
    match = re.search(rf"const {name}=(.*?);\n", source, re.S)
    if not match:
        raise RuntimeError(f"Could not find {name} in {path}")
    return json.loads(match.group(1))


def clean(text: str) -> str:
    return text.replace("…", "").split(" / ")[0]


def fnv_js(text: str) -> str:
    """Match JavaScript charCodeAt-based FNV-1a, including non-BMP text."""
    value = 0x811C9DC5
    encoded = text.encode("utf-16-le")
    for pos in range(0, len(encoded), 2):
        value ^= encoded[pos] | (encoded[pos + 1] << 8)
        value = (value * 0x01000193) & 0xFFFFFFFF
    return f"{value:08x}"


def required_texts() -> list[str]:
    words = js_const(ROOT / "data/words.js", "WORDS")
    texts = js_const(ROOT / "data/texts.js", "TEXTS")
    chars = js_const(ROOT / "data/chars.js", "CHARPY")
    result = set(chars)
    for word in words:
        result.add(clean(word[0]))
        if word[4]:
            result.add(clean(word[4]))
    for text in texts:
        for sentence in text["s"]:
            result.add(sentence["zh"])
            for token in sentence["t"]:
                if re.search(r"[一-鿿]", token[0]):
                    result.add(clean(token[0]))
    return sorted(text for text in result if text.strip())


def load_packs() -> dict[str, dict[str, str]]:
    packs = {}
    for digit in "0123456789abcdef":
        path = ROOT / "audio" / f"a{digit}.json"
        packs[digit] = json.loads(path.read_text(encoding="utf-8"))
    return packs


def update_key_list(keys: list[str]) -> None:
    replacement = 'const AK=new Set("' + " ".join(keys) + '".split(\' \'));'
    pattern = r'const AK=new Set\("[0-9a-f ]*"\.split\(\' \'\)\);'
    for relative in ("source/audio_block.js", "index.html"):
        path = ROOT / relative
        source = path.read_text(encoding="utf-8")
        updated, count = re.subn(pattern, replacement, source, count=1)
        if count != 1:
            raise RuntimeError(f"Could not update AK in {path}")
        path.write_text(updated, encoding="utf-8")


async def main() -> None:
    import edge_tts

    packs = load_packs()
    existing = {key for pack in packs.values() for key in pack}
    missing = [(text, fnv_js(text)) for text in required_texts() if fnv_js(text) not in existing]
    print(f"Missing recordings: {len(missing)}")
    semaphore = asyncio.Semaphore(5)

    async def create(text: str, key: str, temp_dir: Path) -> None:
        path = temp_dir / f"{key}.mp3"
        rate = "-15%" if len(text) <= 2 else "-5%"
        async with semaphore:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, VOICE, rate=rate).save(str(path))
                    data = path.read_bytes()
                    if not data:
                        raise RuntimeError("empty audio file")
                    packs[key[0]][key] = base64.b64encode(data).decode("ascii")
                    print(f"Recorded: {text}")
                    return
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2)

    with tempfile.TemporaryDirectory(prefix="hanzi-audio-") as directory:
        temp_dir = Path(directory)
        await asyncio.gather(*(create(text, key, temp_dir) for text, key in missing))

    for digit, pack in packs.items():
        path = ROOT / "audio" / f"a{digit}.json"
        path.write_text(json.dumps(dict(sorted(pack.items())), ensure_ascii=False), encoding="utf-8")

    keys = sorted({key for pack in packs.values() for key in pack})
    update_key_list(keys)
    print(f"Audio library now contains {len(keys)} recordings using {VOICE}.")


if __name__ == "__main__":
    asyncio.run(main())
