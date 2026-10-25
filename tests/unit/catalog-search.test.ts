import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exactPart, notStocked, searchCatalog, sourcingOffer, type SearchPart, type SearchSpec } from '../../src/lib/catalog-search';

function catalog(): SearchPart[] {
  return readdirSync('src/content/components')
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const data = JSON.parse(readFileSync(`src/content/components/${name}`, 'utf8')) as {
        part_number: string;
        mpn: string;
        name: string;
        category: string;
        voltage?: string;
        specs: SearchSpec[];
      };
      return {
        part_number: data.part_number,
        mpn: data.mpn,
        name: data.name,
        category: data.category,
        voltage: data.voltage,
        specs: data.specs,
      };
    });
}

function ids(parts: readonly SearchPart[], query: string): string[] {
  return searchCatalog(parts, query).map((part) => part.part_number);
}

describe('searchCatalog part numbers', () => {
  const parts = catalog();

  it('ranks lm 7805 as an exact LM7805 match', () => {
    expect(ids(parts, 'lm 7805')[0]).toBe('LM7805');
  });

  it('ranks LM-7805 as an exact LM7805 match', () => {
    expect(ids(parts, 'LM-7805')).toEqual(['LM7805']);
  });

  it('ranks ams1117 3.3 as an exact AMS1117-3.3 match', () => {
    expect(ids(parts, 'ams1117 3.3')[0]).toBe('AMS1117-3.3');
  });

  it('returns nothing for a part the shop does not sell', () => {
    expect(ids(parts, 'TIP120')).toEqual([]);
    expect(ids(parts, 'LM7806')).toEqual([]);
  });

  it('puts an exact part number ahead of a prefix', () => {
    const mixed: SearchPart[] = [
      { part_number: 'LM7805X', mpn: 'LM7805X', name: 'Longer code', category: 'Power' },
      { part_number: 'LM7805', mpn: 'LM7805', name: '5 V regulator', category: 'Power' },
    ];
    expect(ids(mixed, 'LM7805')).toEqual(['LM7805', 'LM7805X']);
  });

  it('matches an MPN that differs from the part number', () => {
    const board: SearchPart = {
      part_number: 'BOARD-1',
      mpn: 'TPS7A4700',
      name: 'Regulator board',
      category: 'Power',
    };
    expect(ids([board], 'TPS-7A4700')).toEqual(['BOARD-1']);
  });

  it('ignores slashes the same way as spaces and hyphens', () => {
    const part: SearchPart = {
      part_number: 'A/B.C-1',
      mpn: 'A/B.C-1',
      name: 'Divider',
      category: 'Power',
    };
    expect(ids([part], 'a/b.c-1')).toEqual(['A/B.C-1']);
    expect(ids([part], 'abc1')).toEqual(['A/B.C-1']);
  });
});

describe('searchCatalog units', () => {
  const parts = catalog();

  it('treats 5v, 5 V and 5V as the same spec match', () => {
    const fiveVolt = ids(parts, '5v');
    expect(fiveVolt).toContain('LM7805');
    expect(new Set(ids(parts, '5 V'))).toEqual(new Set(fiveVolt));
    expect(new Set(ids(parts, '5V'))).toEqual(new Set(fiveVolt));
    expect(fiveVolt).not.toContain('NE555');
    expect(fiveVolt).not.toContain('AMS1117-3.3');
    expect(fiveVolt).not.toContain('DS18B20');
  });

  it('keeps a 5 V regulator ahead of other 5 V parts when both words are present', () => {
    expect(ids(parts, '5v regulator')).toEqual(['LM7805']);
    expect(ids(parts, '5 V regulator')).toEqual(['LM7805']);
  });

  it('reads k as thousand ohms', () => {
    const resistor: SearchPart = {
      part_number: 'R10K',
      mpn: 'R10K',
      name: 'Resistor',
      category: 'Passive',
      specs: [{ value: '10', unit: 'kΩ' }],
    };
    const ohms: SearchPart = {
      part_number: 'R4700',
      mpn: 'R4700',
      name: 'Resistor',
      category: 'Passive',
      specs: [{ value: '4700', unit: 'Ω' }],
    };
    expect(ids([resistor], '10k')).toEqual(['R10K']);
    expect(ids([resistor], '10 kΩ')).toEqual(['R10K']);
    expect(ids([resistor], '10000 ohm')).toEqual(['R10K']);
    expect(ids([ohms], '4.7k')).toEqual(['R4700']);
    expect(ids([...catalog(), resistor], '10k')).toEqual(['R10K']);
  });

  it('reads u as µ', () => {
    const cap: SearchPart = {
      part_number: 'C100',
      mpn: 'C100',
      name: 'Capacitor',
      category: 'Passive',
      specs: [{ value: '100', unit: 'µF' }],
    };
    const rail: SearchPart = {
      part_number: 'REG100',
      mpn: 'REG100',
      name: 'Regulator',
      category: 'Power',
      specs: [{ value: '100', unit: 'V' }],
    };
    expect(ids([cap, rail], '100u')).toEqual(['C100']);
    expect(ids([cap, rail], '100 µF')).toEqual(['C100']);
    expect(ids([cap, rail], '100uf')).toEqual(['C100']);
    expect(ids([cap, rail], '100v')).toEqual(['REG100']);
  });
});

describe('searchCatalog words', () => {
  it('matches summary, category and spec values', () => {
    const part: SearchPart = {
      part_number: 'X1',
      mpn: 'X1',
      name: 'Board',
      summary: 'A steady rail for logic',
      category: 'Boards',
      specs: [{ value: 'TO-220' }],
    };
    expect(ids([part], 'logic')).toEqual(['X1']);
    expect(ids([part], 'boards')).toEqual(['X1']);
    expect(ids([part], 'to-220')).toEqual(['X1']);
  });

  it('puts a prefix ahead of a looser word match', () => {
    const parts: SearchPart[] = [
      { part_number: 'NE555', mpn: 'NE555', name: 'Timer for lm circuits', category: 'ICs' },
      { part_number: 'LM7805', mpn: 'LM7805', name: 'Regulator', category: 'Power' },
    ];
    expect(ids(parts, 'lm')).toEqual(['LM7805', 'NE555']);
  });

  it('returns nothing for a blank query', () => {
    expect(searchCatalog(catalog(), '   ')).toEqual([]);
  });
});

describe('exactPart', () => {
  it('matches a normalized part number and misses a prefix', () => {
    const parts = catalog();
    expect(exactPart(parts, 'lm 7805')?.part_number).toBe('LM7805');
    expect(exactPart(parts, 'LM-7805')?.part_number).toBe('LM7805');
    expect(exactPart(parts, 'lm78')).toBeUndefined();
    expect(exactPart(parts, 'nope')).toBeUndefined();
    expect(notStocked('NOPE')).toBe("We don't stock NOPE.");
    expect(sourcingOffer).toBe("Send the part number on WhatsApp and we'll check Hall Road.");
  });
});
