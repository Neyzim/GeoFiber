import { boxToElement, cableToMapCable, customerToElement, oltToElement } from './map-element';

const location = { longitude: -46.63, latitude: -23.55 };

describe('map element conversion', () => {
  it('converts a CTO box', () => {
    const element = boxToElement({
      id: 'b1',
      name: 'CTO-01',
      type: 'CTO',
      usageStatus: 'ACTIVE',
      powerCapacity: 8,
      location,
    });
    expect(element?.key).toBe('box:b1');
    expect(element?.group).toBe('CTO');
    expect(element?.position).toEqual({ lat: -23.55, lng: -46.63 });
    expect(element?.details).toContainEqual({ label: 'Portas de atendimento', value: '8' });
  });

  it('defaults a missing status to PLANNED', () => {
    expect(oltToElement({ id: 'o1', name: 'OLT', location })?.status).toBe('PLANNED');
  });

  it('ignores items without location or with a short route', () => {
    expect(boxToElement({ id: 'b1', name: 'x', type: 'CEO' })).toBeNull();
    expect(
      cableToMapCable({
        id: 'c1',
        name: 'x',
        role: 'DROP',
        fiberCapacity: 2,
        coordinates: [{ longitude: 0, latitude: 0 }],
      }),
    ).toBeNull();
  });

  it('converts a cable with its length', () => {
    const cable = cableToMapCable({
      id: 'c1',
      name: 'FEEDER-01',
      role: 'FEEDER',
      fiberCapacity: 12,
      lengthMeters: 1234.4,
      coordinates: [
        { longitude: -46.6333, latitude: -23.5505 },
        { longitude: -46.632, latitude: -23.551 },
      ],
    });
    expect(cable?.details).toContainEqual({ label: 'Comprimento', value: '1.234 m' });
    expect(cable?.points).toEqual([
      { lat: -23.5505, lng: -46.6333 },
      { lat: -23.551, lng: -46.632 },
    ]);
  });

  it('converts a customer', () => {
    const element = customerToElement({
      id: 'cu1',
      name: 'Maria',
      contractCode: 'CT-1',
      status: 'BLOCKED',
      location,
    });
    expect(element?.group).toBe('customer');
    expect(element?.status).toBe('BLOCKED');
  });
});
