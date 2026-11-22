import { fakeJwt } from '../../../testing/auth-fixtures';
import { readTokenClaims } from './jwt';
import { roleText } from './roles';

describe('readTokenClaims', () => {
  it('lê o id e o papel do payload', () => {
    expect(readTokenClaims(fakeJwt({ sub: 'u1', role: 'ADMIN' }))).toEqual({ userId: 'u1', role: 'ADMIN' });
  });

  it('lê payload com acentos e caracteres que viram - e _ em base64url', () => {
    expect(readTokenClaims(fakeJwt({ sub: 'ção?>>', role: 'MEMBER' }))).toEqual({
      userId: 'ção?>>',
      role: 'MEMBER',
    });
  });

  it('nunca lança com token malformado', () => {
    expect(readTokenClaims('abc')).toEqual({ userId: null, role: null });
    expect(readTokenClaims('a.@@@.c')).toEqual({ userId: null, role: null });
  });

  it('ignora papel desconhecido', () => {
    expect(readTokenClaims(fakeJwt({ sub: 'u1', role: 'ROOT' }))).toEqual({ userId: 'u1', role: null });
  });
});

describe('roleText', () => {
  it('traduz os papéis', () => {
    expect(roleText('ADMIN')).toBe('Administrador');
    expect(roleText('MEMBER')).toBe('Técnico');
    expect(roleText(null)).toBe('');
  });
});
