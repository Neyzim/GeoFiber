import { GLOSSARY, glossaryTerm, searchGlossary } from './glossary';

describe('glossary', () => {
  it('has unique keys and a short and long text for every term', () => {
    const keys = GLOSSARY.map((term) => term.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const term of GLOSSARY) {
      expect(term.short.length).toBeGreaterThan(10);
      expect(term.long.length).toBeGreaterThan(term.short.length);
    }
  });

  it('covers the terms used on the screens', () => {
    for (const key of ['olt', 'cto', 'ceo', 'dio', 'splitter', 'fusao', 'porta-pon', 'porta-atendimento', 'ponta']) {
      expect(glossaryTerm(key)).toBeDefined();
    }
  });

  it('searches ignoring accents and case', () => {
    expect(searchGlossary('fusao').map((term) => term.key)).toContain('fusao');
    expect(searchGlossary('SPLITTER')[0].key).toBe('splitter');
    expect(searchGlossary('')).toHaveLength(GLOSSARY.length);
    expect(searchGlossary('xyzxyz')).toEqual([]);
  });

  it('ranks matches in the term name before matches in the text', () => {
    expect(searchGlossary('cabo')[0].term.toLowerCase()).toContain('cabo');
  });
});
