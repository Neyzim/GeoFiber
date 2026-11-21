import type { TraceResponse } from '../api/trace-types';
import { traceMarkers, tracePaths } from './trace-map';

const cable = (label: string, coords: [number, number][], fiber?: { color: 'YELLOW' | 'GREEN' | 'WHITE'; number: number; tube: 'GREEN' }) => ({
  kind: 'CABLE' as const,
  id: label,
  label,
  fiber,
  coordinates: coords.map(([longitude, latitude]) => ({ longitude, latitude })),
});

const mainOf = (paths: ReturnType<typeof tracePaths>) => paths.filter((p) => !p.id.endsWith('-casing'));

describe('trace-map', () => {
  it('desenha cada trecho de cabo na cor da própria fibra, com contorno escuro por baixo', () => {
    const response: TraceResponse = {
      direction: 'UPSTREAM',
      steps: [cable('CABO-01', [[-51.57, -10.65], [-51.58, -10.66]], { color: 'YELLOW', number: 2, tube: 'GREEN' })],
    };
    const paths = tracePaths(response);
    const [casing, main] = paths;

    expect(paths).toHaveLength(2);
    expect(casing.id).toBe('trace-path-0-casing');
    expect(casing.color).toBe('#1b2430');
    expect(casing.weight).toBe(9);
    expect(main.id).toBe('trace-path-0');
    expect(main.color).toBe('#fdd835');
    expect(main.weight).toBe(6);
    expect(main.points).toEqual([
      { lat: -10.65, lng: -51.57 },
      { lat: -10.66, lng: -51.58 },
    ]);
  });

  it('marca o traçado como destaque, para ficar inteiro quando o resto do mapa esmaece', () => {
    const response: TraceResponse = {
      direction: 'DOWNSTREAM',
      steps: [cable('CABO-02', [[-51.57, -10.65], [-51.58, -10.66]], { color: 'GREEN', number: 1, tube: 'GREEN' })],
    };
    const [, main] = tracePaths(response);
    expect(main.emphasis).toBe(true);
    expect(main.color).toBe('#2e9e44');
  });

  it('sem a fibra informada no trecho, usa um cinza neutro', () => {
    const response: TraceResponse = {
      direction: 'UPSTREAM',
      steps: [cable('CABO-03', [[-51.57, -10.65], [-51.58, -10.66]])],
    };
    expect(mainOf(tracePaths(response))[0].color).toBe('#9aa0a6');
  });

  it('ignora passos que não são cabo ou que não têm traçado', () => {
    const response: TraceResponse = {
      direction: 'UPSTREAM',
      steps: [
        { kind: 'BOX', id: 'b', label: 'CEO-01', coordinates: [{ longitude: -51.5, latitude: -10.6 }] },
        cable('sem-traçado', []),
        cable('um-ponto', [[-51.5, -10.6]]),
      ],
    };
    expect(tracePaths(response)).toEqual([]);
  });

  it('marca cada quebra no ponto onde ela está, com a frase do motivo', () => {
    const response: TraceResponse = {
      direction: 'UPSTREAM',
      steps: [],
      breaks: [
        { reason: 'NO_CONNECTION', at: { kind: 'FIBER_END', id: 'f', label: 'CABO-02 · fibra 5 · ponta B', coordinates: [{ longitude: -51.59, latitude: -10.67 }] } },
      ],
    };
    const { markers, hidden } = traceMarkers(response);

    expect(markers).toEqual([
      {
        key: 'trace-break-0',
        point: { lat: -10.67, lng: -51.59 },
        message: 'Esta ponta não está ligada a nada.',
      },
    ]);
    expect(hidden).toBe(0);
  });

  it('sem posição própria, a quebra vai para a última caixa do caminho', () => {
    const response: TraceResponse = {
      direction: 'UPSTREAM',
      steps: [
        { kind: 'BOX', id: 'b1', label: 'CEO-01', coordinates: [{ longitude: -51.58, latitude: -10.66 }] },
      ],
      breaks: [{ reason: 'NO_SIGNAL', at: { kind: 'FIBER_END', id: 'f', label: 'fibra' } }],
    };
    const { markers } = traceMarkers(response);

    expect(markers[0].point).toEqual({ lat: -10.66, lng: -51.58 });
    expect(markers[0].message).toBe('Esta porta não recebe sinal.');
  });

  it('conta como oculta a quebra que não tem nenhuma posição', () => {
    const response: TraceResponse = {
      direction: 'UPSTREAM',
      steps: [],
      breaks: [{ reason: 'LOOP', at: { kind: 'FIBER', id: 'f', label: 'fibra' } }],
    };
    expect(traceMarkers(response)).toEqual({ markers: [], hidden: 1 });
  });
});
