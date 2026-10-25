import { describe, expect, it } from 'vitest';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { partTransitionClass, partTransitionCss, partTransitionName } from '../../src/lib/part-image';

describe('part transition names', () => {
  it('turns part numbers into CSS idents', () => {
    expect(partTransitionName('AMS1117-3.3')).toBe('part-photo-ams1117-3-3');
    expect(partTransitionName('ESP32-WROOM-32D')).toBe('part-photo-esp32-wroom-32d');
    expect(partTransitionClass('LM7805')).toBe('vt-part-photo-lm7805');
    expect(partTransitionCss(['AMS1117-3.3', ''])).toBe(
      '.vt-part-photo-ams1117-3-3{view-transition-name:part-photo-ams1117-3-3;view-transition-class:part-morph part-photo}' +
        '.vt-part-chip-ams1117-3-3{view-transition-name:part-chip-ams1117-3-3;view-transition-class:part-morph part-chip}' +
        '@media (prefers-reduced-motion:reduce){.vt-part-photo-ams1117-3-3,.vt-part-chip-ams1117-3-3{view-transition-name:none;view-transition-class:none}}',
    );
  });
});

describe('part photo paths', () => {
  it('keeps photographs local and rejects placeholder hosts', async () => {
    const dir = path.resolve('src/content/components');
    const files = (await readdir(dir)).filter((name) => name.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const record = JSON.parse(await readFile(path.join(dir, file), 'utf8')) as {
        image?: string;
        images?: { src?: string; alt?: string; note?: string }[];
      };
      expect(record.image, file).toBeUndefined();
      const photo = record.images?.[0];
      if (!photo) continue;
      expect(photo.alt, file).toBeTruthy();
      expect(photo.src, file).toBeTruthy();
      expect(photo.src, file).not.toContain('placehold.co');
      expect(photo.src!.startsWith('../../assets/parts/'), file).toBe(true);
      await access(path.resolve(dir, photo.src!));
    }
  });
});
