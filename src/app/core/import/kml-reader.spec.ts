import { NetworkFileError } from './network-file';
import { readKml } from './kml-reader';

const doc = (body: string, extra = '') =>
  `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2">` +
  `<Document>${extra}${body}</Document></kml>`;

describe('readKml', () => {
  it('reads points and lines with name, folder path and description as text', () => {
    const kml = doc(
      `<Folder><name>Rede</name><Folder><name>CTOs</name>
         <Placemark><name>CTO-001</name>
           <description><![CDATA[<b>Rua A</b>]]></description>
           <Point><coordinates>-51.57,-10.65,0</coordinates></Point>
         </Placemark>
       </Folder></Folder>`,
    );
    const [item] = readKml(kml).placemarks;
    expect(item).toEqual({
      ref: 'p-1',
      name: 'CTO-001',
      description: 'Rua A',
      folderPath: ['Rede', 'CTOs'],
      geometry: { kind: 'point', point: { lat: -10.65, lng: -51.57 } },
      style: {},
    });
  });

  it('resolves shared styles, StyleMap (normal) and inline styles; converts aabbggrr', () => {
    const kml = doc(
      `<Placemark><name>A</name><styleUrl>#m</styleUrl>
         <Point><coordinates>-51.57,-10.65</coordinates></Point></Placemark>
       <Placemark><name>B</name><styleUrl>#s</styleUrl>
         <Style><LineStyle><color>ff0000ff</color><width>5</width></LineStyle></Style>
         <LineString><coordinates>-51.57,-10.65 -51.58,-10.66</coordinates></LineString></Placemark>`,
      `<Style id="s"><IconStyle><color>ff0000ff</color><Icon><href>files/cto.png</href></Icon></IconStyle>
         <LineStyle><color>ff00ff00</color><width>3</width></LineStyle></Style>
       <StyleMap id="m"><Pair><key>normal</key><styleUrl>#s</styleUrl></Pair>
         <Pair><key>highlight</key><styleUrl>#x</styleUrl></Pair></StyleMap>`,
    );
    const [point, line] = readKml(kml).placemarks;
    expect(point.style).toEqual({ iconHref: 'files/cto.png', iconColor: '#ff0000', lineColor: '#00ff00', lineWidth: 3 });
    expect(line.style).toEqual({ lineColor: '#ff0000', lineWidth: 5 });
  });

  it('matches tags by local name whatever the namespace', () => {
    const body = `<Placemark><name>CTO-001</name><Point><coordinates>-51.57,-10.65</coordinates></Point></Placemark>`;
    const withNs = readKml(doc(body)).placemarks;
    const noNs = readKml(
      `<kml><Document>${body}</Document></kml>`,
    ).placemarks;
    expect(noNs).toEqual(withNs);
    expect(noNs[0].name).toBe('CTO-001');
  });

  it('splits a MultiGeometry into one item per geometry', () => {
    const kml = doc(
      `<Placemark><name>Trecho</name><MultiGeometry>
         <LineString><coordinates>-51.57,-10.65 -51.58,-10.66</coordinates></LineString>
         <LineString><coordinates>-51.58,-10.66 -51.59,-10.67</coordinates></LineString>
       </MultiGeometry></Placemark>`,
    );
    expect(readKml(kml).placemarks.map((p) => p.ref)).toEqual(['l-1-1', 'l-1-2']);
  });

  it('reads coordinates with line breaks, tabs and altitude, and skips bad geometry with a warning', () => {
    const kml = doc(
      `<Placemark><name>OK</name><Point><coordinates>
          -51.57 , -10.65 , 0
        </coordinates></Point></Placemark>
       <Placemark><name>ruim</name><Point><coordinates>abc,def</coordinates></Point></Placemark>
       <Placemark><name>curta</name><LineString><coordinates>-51.57,-10.65</coordinates></LineString></Placemark>
       <Placemark><name>repetida</name><LineString><coordinates>-51.57,-10.65 -51.57,-10.65</coordinates></LineString></Placemark>`,
    );
    const result = readKml(kml);
    expect(result.placemarks.map((p) => p.name)).toEqual(['OK']);
    expect(result.warnings).toContain('3 itens com coordenadas inválidas foram ignorados.');
  });

  it('ignores polygons and network links with a warning', () => {
    const kml = doc(
      `<Placemark><name>Ponto</name><Point><coordinates>-51.57,-10.65</coordinates></Point></Placemark>
       <Placemark><name>Área</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-51.57,-10.65 -51.58,-10.66 -51.59,-10.65 -51.57,-10.65</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
       <NetworkLink><name>Link</name></NetworkLink>`,
    );
    const result = readKml(kml);
    expect(result.placemarks).toHaveLength(1);
    expect(result.warnings).toEqual(['1 área (polígono) foi ignorada.', '1 link de rede foi ignorado.']);
  });

  it('explains invalid XML and a file without points or lines', () => {
    expect(() => readKml('<kml><Placemark>')).toThrowError(
      new NetworkFileError('Este arquivo não é um KMZ/KML válido.'),
    );
    expect(() => readKml(doc('<Placemark><name>só nome</name></Placemark>'))).toThrowError(
      new NetworkFileError('Nenhum ponto ou linha encontrado no arquivo.'),
    );
  });
});
