import { describe, expect, it } from 'vitest';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { partTransitionClass, partTransitionCss, partTransitionName } from '../../src/lib/part-image';

describe('part transition names', () => {
  it('turns part numbers into CSS idents', () => {
    expect(partTransitionName('AMS1117-3.3')).toBe('part-ams1117-3-3');
    expect(partTransitionName('ESP32-WROOM-32D')).toBe('part-esp32-wroom-32d');
    expect(partTransitionClass('LM7805')).toBe('vt-part-lm7805');
    expect(partTransitionCss(['AMS1117-3.3', ''])).toBe(
      '.vt-part-ams1117-3-3{view-transition-name:part-ams1117-3-3}',
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
        image_note?: string;
      };
      if (record.image_note) expect(record.image, file).toBeTruthy();
      if (!record.image) continue;
      expect(record.image, file).not.toContain('placehold.co');
      expect(record.image.startsWith('../../assets/parts/'), file).toBe(true);
      await access(path.resolve(dir, record.image));
    }
  });
});
