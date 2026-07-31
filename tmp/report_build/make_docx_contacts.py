from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


folder = Path(sys.argv[1])
chunk_size = int(sys.argv[2]) if len(sys.argv) > 2 else 20
files = sorted(
    folder.glob("page-*.png"),
    key=lambda path: int(path.stem.split("-")[-1]),
)
font = ImageFont.load_default()

for chunk_index in range(0, len(files), chunk_size):
    chunk = files[chunk_index : chunk_index + chunk_size]
    cards = []
    for file in chunk:
        image = Image.open(file).convert("RGB")
        scale = min(260 / image.width, 360 / image.height)
        image = image.resize(
            (max(1, int(image.width * scale)), max(1, int(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
        card = Image.new("RGB", (280, 395), "white")
        draw = ImageDraw.Draw(card)
        draw.text((8, 6), file.stem, fill="black", font=font)
        card.paste(image, ((280 - image.width) // 2, 27))
        cards.append(card)
    cols = 4
    rows = (len(cards) + cols - 1) // cols
    contact = Image.new("RGB", (cols * 280, rows * 395), (220, 225, 230))
    for index, card in enumerate(cards):
        contact.paste(card, ((index % cols) * 280, (index // cols) * 395))
    start = chunk_index + 1
    end = chunk_index + len(chunk)
    contact.save(folder.parent / f"{folder.name}_contact_{start:03d}_{end:03d}.png")

print(f"{folder.name}: {len(files)} pages")
