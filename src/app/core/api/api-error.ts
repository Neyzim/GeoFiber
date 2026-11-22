import { HttpErrorResponse } from '@angular/common/http';
import { translateDetail } from './error-messages';

/** Erro da API já preparado para ser exibido ao usuário. */
export interface ApiError {
  /** Status HTTP (0 = sem resposta do servidor). */
  status: number;
  /** Mensagem em português. */
  message: string;
  /** Erros de validação por campo (já no idioma pedido em `Accept-Language`). */
  fieldErrors: Record<string, string>;
  /** `detail` original do backend, em inglês, quando existir. */
  original: string | null;
}

const OFFLINE_MESSAGE =
  'Não foi possível conectar ao servidor do GeoFiber. Verifique se o backend está rodando.';
const SERVER_MESSAGE = 'Erro inesperado no servidor. Tente novamente.';
const FIELDS_MESSAGE = 'Verifique os campos destacados.';

const SESSION_EXPIRED = 'Sua sessão expirou. Entre novamente.';

/** Frases que o backend já manda em português (autenticação, dono e usuários). */
const BACKEND_PT_DETAILS = new Set([
  'Credenciais inválidas ou sessão expirada.',
  'Acesso negado.',
  'Só o criador pode alterar este elemento.',
  'Só o dono de um dos elementos pode alterar esta ligação.',
  'Você não pode desativar a própria conta.',
  'E-mail já cadastrado.',
  'A senha precisa ter pelo menos 10 caracteres.',
  'Usuário não encontrado.',
]);

/** Frases do backend técnicas demais para quem está no meio do uso. */
const REPLACED_DETAILS: Record<string, string> = {
  'Autenticação necessária.': SESSION_EXPIRED,
};

const STATUS_MESSAGES: Record<number, string> = {
  401: SESSION_EXPIRED,
  403: 'Você não tem permissão para fazer isso.',
  400: 'Os dados enviados são inválidos.',
  404: 'O item não foi encontrado. Ele pode ter sido excluído por outra pessoa.',
  409: 'A operação conflita com dados já cadastrados.',
};

/** Converte qualquer erro (ProblemDetail, rede, exceção) em `ApiError`. Nunca lança. */
export function parseApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: 0, message: SERVER_MESSAGE, fieldErrors: {}, original: null };
  }
  if (error.status === 0) {
    return { status: 0, message: OFFLINE_MESSAGE, fieldErrors: {}, original: null };
  }

  const status = error.status;
  const body = isRecord(error.error) ? error.error : null;
  const detail = typeof body?.['detail'] === 'string' ? body['detail'] : null;
  const fieldErrors = readFieldErrors(body?.['errors']);

  if (Object.keys(fieldErrors).length > 0) {
    return { status, message: FIELDS_MESSAGE, fieldErrors, original: detail };
  }

  const translated = detail ? backendText(detail) ?? translateDetail(detail) : null;
  return {
    status,
    message: translated ?? STATUS_MESSAGES[status] ?? SERVER_MESSAGE,
    fieldErrors,
    original: detail,
  };
}

function backendText(detail: string): string | null {
  const text = detail.trim();
  if (BACKEND_PT_DETAILS.has(text)) return text;
  return REPLACED_DETAILS[text] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFieldErrors(errors: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!Array.isArray(errors)) {
    return result;
  }
  for (const item of errors) {
    if (isRecord(item) && typeof item['field'] === 'string' && typeof item['message'] === 'string') {
      result[item['field']] = item['message'];
    }
  }
  return result;
}
