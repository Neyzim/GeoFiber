import { UserRole } from '../api/api-types';

export interface TokenClaims {
  userId: string | null;
  role: UserRole | null;
}

const ROLES: readonly UserRole[] = ['ADMIN', 'MEMBER'];

/**
 * Lê `sub` e `role` do payload do JWT, só para a interface (mostrar ou esconder partes da tela).
 * Não confere a assinatura: quem decide o acesso é o backend. Nunca lança.
 */
export function readTokenClaims(token: string): TokenClaims {
  try {
    const part = token.split('.')[1];
    if (!part) return { userId: null, role: null };
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof payload !== 'object' || payload === null) return { userId: null, role: null };
    const { sub, role } = payload as Record<string, unknown>;
    return {
      userId: typeof sub === 'string' ? sub : null,
      role: ROLES.includes(role as UserRole) ? (role as UserRole) : null,
    };
  } catch {
    return { userId: null, role: null };
  }
}
