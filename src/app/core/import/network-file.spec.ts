import { zipSync } from 'fflate';
import { NetworkFileError, openNetworkFile } from './network-file';

/** Bytes ASCII criados no contexto do teste (strToU8 gera outro realm no runner e o fflate não reconhece). */
const strToU8 = (text: string): Uint8Array => Uint8Array.from(text, (c) => c.charCodeAt(0));

const KML = '<?xml version="1.0" encoding="UTF-8"?><kml><Document><name>Rede</name></Document></kml>';

describe('openNetworkFile', () => {
  it('opens a plain KML', () => {
    const file = openNetworkFile('rede.kml', strToU8(KML));
    expect(file.kml).toContain('<kml');
    expect(file.icons.size).toBe(0);
  });

  it('takes doc.kml from a KMZ, or the first .kml when there is no doc.kml', () => {
    const withDoc = zipSync({
      'files/x.kml': strToU8('<kml>outro</kml>'),
      'doc.kml': strToU8(KML),
    });
    expect(openNetworkFile('a.kmz', withDoc).kml).toContain('<name>Rede</name>');

    const withoutDoc = zipSync({ 'a/rede.kml': strToU8(KML) });
    expect(openNetworkFile('b.kmz', withoutDoc).kml).toContain('<name>Rede</name>');
  });

  it('keeps the images of a KMZ as icons by path', () => {
    const kmz = zipSync({
      'doc.kml': strToU8(KML),
      'files/cto.png': strToU8('png'),
    });
    const file = openNetworkFile('a.kmz', kmz);
    expect(file.icons.has('files/cto.png')).toBe(true);
  });

  it('decodes the encoding declared in the XML', () => {
    const text = '<?xml version="1.0" encoding="ISO-8859-1"?><kml><name>Caixa São João</name></kml>';
    const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
    expect(openNetworkFile('antigo.kml', bytes).kml).toContain('São João');
  });

  it('explains a broken KMZ', () => {
    const garbage = Uint8Array.from([1, 2, 3, 4, 5]);
    expect(() => openNetworkFile('ruim.kmz', garbage)).toThrowError(
      new NetworkFileError('Este arquivo não é um KMZ/KML válido.'),
    );
  });

  it('explains a KMZ without KML inside', () => {
    const kmz = zipSync({ 'files/cto.png': strToU8('png') });
    expect(() => openNetworkFile('vazio.kmz', kmz)).toThrowError(
      new NetworkFileError('O KMZ não tem nenhum KML dentro.'),
    );
  });

  it('refuses other extensions', () => {
    expect(() => openNetworkFile('rede.txt', strToU8(KML))).toThrowError(
      new NetworkFileError('Escolha um arquivo .kmz ou .kml.'),
    );
  });
});
