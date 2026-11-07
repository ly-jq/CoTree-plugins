"""Bounded image IO for the preserved Game Studio processing algorithms."""
from pathlib import Path
from PIL import Image

MAX_PIXELS = 16 * 1024 * 1024


def load_rgba(file: str | Path) -> Image.Image:
    with Image.open(file) as image:
        if image.width * image.height > MAX_PIXELS:
            raise ValueError("Image exceeds 16 megapixels.")
        return image.convert("RGBA")


def save_new_png(image: Image.Image, file: str | Path) -> None:
    if image.width * image.height > MAX_PIXELS:
        raise ValueError("Output exceeds 16 megapixels.")
    with Path(file).open("xb") as output:
        image.save(output, format="PNG")


def load_frames(files: list[Path]) -> list[Image.Image]:
    if len(files) > 256:
        raise ValueError("At most 256 frames are supported.")
    images: list[Image.Image] = []
    total = 0
    for file in files:
        image = load_rgba(file)
        total += image.width * image.height
        if total > MAX_PIXELS:
            raise ValueError("Combined frames exceed 16 megapixels.")
        images.append(image)
    return images
