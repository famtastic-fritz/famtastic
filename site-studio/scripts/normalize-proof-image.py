#!/usr/bin/env python3
"""Normalize generated proof media into a portable, bounded JPEG."""

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("output")
    args = parser.parse_args()

    source = Path(args.source)
    output = Path(args.output)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        if min(image.size) < 512:
            raise ValueError(f"generated image is too small: {image.size[0]}x{image.size[1]}")
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        output.parent.mkdir(parents=True, exist_ok=True)
        image.save(output, "JPEG", quality=72, optimize=True, progressive=True)

    size = output.stat().st_size
    if size < 10_000 or size > 750_000:
        output.unlink(missing_ok=True)
        raise ValueError(f"normalized proof image has invalid size: {size} bytes")


if __name__ == "__main__":
    main()
