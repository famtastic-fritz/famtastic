#!/usr/bin/env python3
"""
FAMtastic rembg worker — background removal via Python API.
Usage: python3 scripts/rembg-worker.py <input_path> <output_path>

Uses the rembg Python API directly (avoids CLI dependency issues).
Output is always a RGBA PNG with transparent background.
"""
import sys
import os

if len(sys.argv) != 3:
    print("Usage: rembg-worker.py <input> <output>", file=sys.stderr)
    sys.exit(1)

input_path = sys.argv[1]
output_path = sys.argv[2]

if not os.path.exists(input_path):
    print(f"Input file not found: {input_path}", file=sys.stderr)
    sys.exit(1)

try:
    from rembg import remove
    from PIL import Image
    import io

    with open(input_path, 'rb') as f:
        input_data = f.read()

    output_data = remove(input_data)

    # Ensure output is RGBA PNG
    img = Image.open(io.BytesIO(output_data)).convert('RGBA')
    img.save(output_path, 'PNG')

    print(f"ok: {img.size[0]}x{img.size[1]} RGBA")
    sys.exit(0)

except ImportError as e:
    print(f"Import error: {e}. Install: pip3 install rembg pillow", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
