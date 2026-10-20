#!/usr/bin/env python3
"""Build a minimal Chrome Web Store ZIP from the CrownScroll repository."""
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile

LOG = logging.getLogger('crownscroll.release')
ROOT = Path(__file__).resolve().parents[1]
RELEASE_FILES = (
    'manifest.json', 'content.js', 'scroll-engine.js', 'popup.html', 'popup.js',
    'assets/icon16.png', 'assets/icon32.png', 'assets/icon48.png', 'assets/icon128.png',
)


def build(output: Path) -> int:
    missing = [rel for rel in RELEASE_FILES if not (ROOT / rel).is_file()]
    if missing:
        raise FileNotFoundError('Missing extension files: ' + ', '.join(missing))
    manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('manifest_version') != 3:
        raise ValueError('Expected a Manifest V3 extension')
    declared = set(manifest['content_scripts'][0]['matches'])
    allowed = {'https://chatgpt.com/*', 'https://chat.openai.com/*'}
    if declared != allowed:
        raise ValueError(f'Unexpected content-script host scope: {sorted(declared)!r}')
    if manifest.get('background') or manifest.get('host_permissions'):
        raise ValueError('Manifest permission model changed; review before publishing')
    if manifest.get('permissions') != ['storage', 'scripting', 'activeTab']:
        raise ValueError('Manifest permissions changed; update privacy disclosures')
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.resolve().is_relative_to(ROOT.resolve()) and output.name in RELEASE_FILES:
        raise ValueError('Output cannot overwrite a source file')
    with ZipFile(output, 'w', compression=ZIP_DEFLATED) as zf:
        for rel in RELEASE_FILES:
            zf.write(ROOT / rel, rel)
    with ZipFile(output) as zf:
        names = set(zf.namelist())
        if names != set(RELEASE_FILES):
            raise RuntimeError('Release archive files do not match intended manifest')
        inner = json.loads(zf.read('manifest.json'))
        if inner['version'] != manifest['version']:
            raise RuntimeError('Archive manifest version mismatch')
    LOG.info('Created %s (%s bytes) for v%s', output, output.stat().st_size, manifest['version'])
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='Build the CrownScroll Chrome Web Store upload ZIP')
    parser.add_argument('--output', type=Path, default=ROOT / 'CrownScroll_Chrome_Web_Store_Upload_v1_3.zip')
    parser.add_argument('--verbose', action='store_true')
    args = parser.parse_args()
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format='%(levelname)s: %(message)s')
    try:
        return build(args.output)
    except (OSError, ValueError, RuntimeError, KeyError, json.JSONDecodeError) as exc:
        LOG.error('Release build failed: %s', exc)
        return 1


if __name__ == '__main__':
    sys.exit(main())
