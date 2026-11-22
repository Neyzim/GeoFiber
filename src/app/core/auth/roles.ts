import { UserRole } from '../api/api-types';

const ROLE_TEXT: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MEMBER: 'Técnico',
};

/** Papel em português para a tela ("Administrador", "Técnico"). */
export function roleText(role: UserRole | null): string {
  return role ? ROLE_TEXT[role] : '';
}
