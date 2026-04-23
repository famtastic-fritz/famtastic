#!/usr/bin/env python3
"""
tier3-ps-driver.py — Photoshop Generative Fill driver for tier-comparison.

Usage:
  python3 tier3-ps-driver.py \
    --anchor /path/to/anchor.jpg \
    --prompt "waving hello, ..." \
    --output /path/to/output.png \
    --pose "waving hello"

Communicates with Photoshop via adb-proxy-socket (must be running at localhost:3001).
"""

import argparse
import os
import sys
import base64

# adb-mcp mcp/ directory is on PYTHONPATH (set by the Node caller)
import socket_client
import core
import logger

APPLICATION = 'photoshop'
PROXY_URL   = 'http://localhost:3001'
PROXY_TIMEOUT = 60  # Generative Fill can be slow


def configure():
    socket_client.configure(app=APPLICATION, url=PROXY_URL, timeout=PROXY_TIMEOUT)
    core.init(APPLICATION, socket_client)


def send(action, options=None):
    cmd = core.createCommand(action, options or {})
    resp = socket_client.send_message_blocking(cmd)
    if resp is None:
        raise RuntimeError(f'{action}: no response from proxy')
    if resp.get('status') == 'FAILURE':
        raise RuntimeError(f'{action} failed: {resp.get("message", "unknown error")}')
    return resp


def run(anchor_path, prompt, output_path, pose_name):
    configure()

    # 1. Create a 512×512 white document
    print(f'[PS] Creating document for pose: {pose_name}')
    doc_resp = send('createDocument', {
        'name': f'tier3-{pose_name[:20]}',
        'width': 512,
        'height': 512,
        'resolution': 72,
        'fillColor': {'red': 255, 'green': 255, 'blue': 255},
        'colorMode': 'RGB',
    })
    print(f'[PS] Document created')

    # 2. Get layers so we can grab the Background layer id
    layers_resp = send('getLayers', {})
    layers = layers_resp.get('response', [])
    bg_layer_id = None
    if isinstance(layers, list) and layers:
        # Background is typically the bottom layer
        def find_layer(lst, name):
            for l in lst:
                if isinstance(l, dict):
                    if l.get('name', '').lower() == name.lower():
                        return l.get('id')
                    if 'layers' in l:
                        found = find_layer(l['layers'], name)
                        if found is not None:
                            return found
            return None
        bg_layer_id = find_layer(layers, 'Background')

    # 3. Place anchor image onto the background layer (provides visual context)
    if bg_layer_id is not None:
        try:
            print(f'[PS] Placing anchor image (layer {bg_layer_id})')
            send('placeImage', {'layerId': bg_layer_id, 'imagePath': anchor_path})
        except Exception as e:
            print(f'[PS] Warning: placeImage failed ({e}) — continuing without anchor context')
    else:
        print('[PS] Warning: could not find Background layer — skipping anchor placement')

    # 4. Generate image with pose prompt using Firefly Generative AI
    gen_layer_name = f'gen-{pose_name[:30]}'
    print(f'[PS] Generating: {prompt[:80]}...')
    send('generateImage', {
        'layerName': gen_layer_name,
        'prompt': prompt,
        'contentType': 'art',
    })
    print(f'[PS] Generation complete')

    # 5. Find the generated layer id
    layers_resp2 = send('getLayers', {})
    layers2 = layers_resp2.get('response', [])
    gen_layer_id = None
    def find_layer_by_name(lst, name):
        for l in lst:
            if isinstance(l, dict):
                if l.get('name', '') == name:
                    return l.get('id')
                if 'layers' in l:
                    found = find_layer_by_name(l['layers'], name)
                    if found is not None:
                        return found
        return None

    gen_layer_id = find_layer_by_name(layers2, gen_layer_name)

    # 6. Export the generated layer as PNG
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if gen_layer_id is not None:
        print(f'[PS] Exporting layer {gen_layer_id} → {output_path}')
        send('exportLayersAsPng', {
            'layersInfo': [{'layerId': gen_layer_id, 'filePath': output_path}],
        })
    else:
        # Fallback: save the whole document as PNG
        print(f'[PS] Layer not found by name — saving full document as PNG')
        send('saveDocumentAs', {'filePath': output_path, 'fileType': 'PNG'})

    if os.path.exists(output_path):
        size = os.path.getsize(output_path)
        print(f'[PS] Saved {size:,} bytes → {output_path}')
    else:
        raise RuntimeError(f'Output file not found after export: {output_path}')


def main():
    parser = argparse.ArgumentParser(description='Photoshop Generative Fill driver')
    parser.add_argument('--anchor', required=True, help='Path to anchor image')
    parser.add_argument('--prompt', required=True, help='Full generation prompt')
    parser.add_argument('--output', required=True, help='Output PNG path')
    parser.add_argument('--pose',   required=True, help='Pose name (for logging)')
    args = parser.parse_args()

    if not os.path.exists(args.anchor):
        print(f'ERROR: anchor file not found: {args.anchor}', file=sys.stderr)
        sys.exit(1)

    try:
        run(args.anchor, args.prompt, args.output, args.pose)
        sys.exit(0)
    except Exception as e:
        print(f'ERROR: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
