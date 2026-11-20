import { HttpErrorResponse } from '@angular/common/http';
import { parseApiError } from './api-error';

function httpError(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('parseApiError', () => {
  it('explains that the backend is offline (status 0)', () => {
    const result = parseApiError(httpError(0, null));
    expect(result.status).toBe(0);
    expect(result.message).toBe(
      'Não foi possível conectar ao servidor do GeoFiber. Verifique se o backend está rodando.',
    );
  });

  it('survives an HTML body', () => {
    const result = parseApiError(httpError(502, '<html>Bad Gateway</html>'));
    expect(result.message).toBe('Erro inesperado no servidor. Tente novamente.');
    expect(result.original).toBeNull();
  });

  it('uses the 404 message when the body is null', () => {
    expect(parseApiError(httpError(404, null)).message).toBe(
      'O item não foi encontrado. Ele pode ter sido excluído por outra pessoa.',
    );
  });

  it('translates a detail with a number', () => {
    const result = parseApiError(httpError(409, { status: 409, detail: 'Tray 3 is full' }));
    expect(result.message).toBe('A bandeja 3 está cheia.');
    expect(result.original).toBe('Tray 3 is full');
  });

  it('translates the fiber end', () => {
    const result = parseApiError(httpError(409, { detail: 'Fiber end B is not available' }));
    expect(result.message).toContain('ponta B');
  });

  it('translates a broken fiber', () => {
    const result = parseApiError(
      httpError(409, { detail: 'Fiber is BROKEN and cannot be connected' }),
    );
    expect(result.message).toContain('rompida');
  });

  it.each([
    ['A customer with this contract code already exists', 'Já existe um cliente com este código de contrato.'],
    [
      'A fiber with this absolute number already exists in the cable',
      'Já existe uma fibra com este número no cabo.',
    ],
    [
      'An OLT port already exists at this slot and port number',
      'Já existe uma porta PON neste slot e número.',
    ],
    [
      'This tray position is already used by another splice',
      'Esta posição da bandeja já está ocupada por outra fusão.',
    ],
    ['Element is already attached to this cable', 'Este elemento já está na lista do cabo.'],
    ['A tube with this number already exists in the cable', 'Já existe um item com este número aqui.'],
  ])('translates the uniqueness conflict "%s"', (detail, message) => {
    expect(parseApiError(httpError(409, { detail })).message).toBe(message);
  });

  it('falls back to a generic 409 and keeps the original detail', () => {
    const result = parseApiError(httpError(409, { detail: 'Something new' }));
    expect(result.message).toBe('A operação conflita com dados já cadastrados.');
    expect(result.original).toBe('Something new');
  });

  it('collects field errors from a validation problem', () => {
    const result = parseApiError(
      httpError(400, {
        detail: 'Invalid request content.',
        errors: [{ field: 'name', message: 'não deve estar em branco' }],
      }),
    );
    expect(result.fieldErrors).toEqual({ name: 'não deve estar em branco' });
    expect(result.message).toBe('Verifique os campos destacados.');
  });

  it('does not throw for a non-http error', () => {
    const result = parseApiError(new Error('x'));
    expect(result.status).toBe(0);
    expect(result.message).toBeTruthy();
  });
});
