import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { UserResponse } from '../../core/api/api-types';
import { AuthSession } from '../../core/auth/auth-session';
import { PasswordDialogComponent } from '../../shared/users/password-dialog';
import { UserFormDialogComponent } from '../../shared/users/user-form-dialog';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog';
import { UsersPage } from './users-page';
import { UsersStore } from './users-store';

const admin: UserResponse = { id: 'u0', name: 'Dono', email: 'dono@x.com', role: 'ADMIN', active: true };
const maria: UserResponse = { id: 'u1', name: 'Maria Silva', email: 'maria@x.com', role: 'MEMBER', active: true };
const joao: UserResponse = { id: 'u2', name: 'João Souza', email: 'joao@x.com', role: 'MEMBER', active: false };

interface FakeStore {
  users: WritableSignal<readonly UserResponse[]>;
  loading: WritableSignal<boolean>;
  loadError: WritableSignal<string | null>;
  busyId: WritableSignal<string | null>;
  load: ReturnType<typeof vi.fn>;
  setActive: ReturnType<typeof vi.fn>;
}

function setup(options: { closeWith?: unknown } = {}) {
  const store: FakeStore = {
    users: signal([admin, joao, maria]),
    loading: signal(false),
    loadError: signal(null),
    busyId: signal(null),
    load: vi.fn(),
    setActive: vi.fn(),
  };
  const dialog = {
    open: vi.fn(() => ({ afterClosed: () => of(options.closeWith) })),
  };
  TestBed.configureTestingModule({
    imports: [UsersPage],
    providers: [provideRouter([]), { provide: AuthSession, useValue: { userId: () => 'u0' } }],
  });
  TestBed.overrideComponent(UsersPage, {
    set: {
      providers: [
        { provide: UsersStore, useValue: store },
        { provide: MatDialog, useValue: dialog },
      ],
    },
  });
  const fixture = TestBed.createComponent(UsersPage);
  fixture.detectChanges();
  return { fixture, store, dialog };
}

type Fixture = ComponentFixture<UsersPage>;
const root = (fixture: Fixture) => fixture.nativeElement as HTMLElement;
const text = (fixture: Fixture) => (root(fixture).textContent ?? '').replace(/\s+/g, ' ');
const row = (fixture: Fixture, id: string) => root(fixture).querySelector<HTMLElement>(`[data-user-id="${id}"]`)!;
const click = (element: HTMLElement | null, selector: string) =>
  element!.querySelector<HTMLElement>(selector)!.click();

describe('UsersPage', { timeout: 20000 }, () => {
  it('carrega ao abrir e mostra o carregamento', () => {
    const { fixture, store } = setup();
    expect(store.load).toHaveBeenCalledTimes(1);
    store.users.set([]);
    store.loading.set(true);
    fixture.detectChanges();
    expect(text(fixture)).toContain('Carregando usuários...');
  });

  it('erro ao carregar: mensagem, tentar de novo e nenhuma linha', () => {
    const { fixture, store } = setup();
    store.users.set([]);
    store.loadError.set('Não foi possível conectar ao servidor do GeoFiber.');
    fixture.detectChanges();
    expect(text(fixture)).toContain('Não foi possível conectar ao servidor do GeoFiber.');
    expect(root(fixture).querySelector('[data-user-id]')).toBeNull();
    click(root(fixture), '[data-action="tentar-novamente"]');
    expect(store.load).toHaveBeenCalledTimes(2);
  });

  it('linhas em português, sem códigos do backend', () => {
    const { fixture } = setup();
    const line = row(fixture, 'u1').textContent!.replace(/\s+/g, ' ');
    expect(line).toContain('Maria Silva');
    expect(line).toContain('maria@x.com');
    expect(line).toContain('Técnico · Ativa');
    expect(row(fixture, 'u2').textContent).toContain('Desativada');
    expect(row(fixture, 'u0').textContent).toContain('Administrador');
    expect(text(fixture)).not.toMatch(/ADMIN|MEMBER/);
  });

  it('a própria linha mostra (você) e não pode ser desativada', () => {
    const { fixture } = setup();
    expect(row(fixture, 'u0').textContent).toContain('(você)');
    expect(row(fixture, 'u0').querySelector('[data-action="desativar"]')).toBeNull();
    expect(row(fixture, 'u1').textContent).not.toContain('(você)');
  });

  it('desativar pede confirmação', () => {
    const { fixture, store, dialog } = setup({ closeWith: true });
    click(row(fixture, 'u1'), '[data-action="desativar"]');
    expect(dialog.open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.objectContaining({
        data: {
          title: 'Desativar Maria Silva?',
          message: 'Ela sai do sistema em até 15 minutos e não consegue entrar de novo até ser reativada.',
          confirmLabel: 'Desativar',
          danger: true,
        },
      }),
    );
    expect(store.setActive).toHaveBeenCalledWith(maria, false);
  });

  it('cancelar a confirmação não desativa', () => {
    const { fixture, store } = setup({ closeWith: false });
    click(row(fixture, 'u1'), '[data-action="desativar"]');
    expect(store.setActive).not.toHaveBeenCalled();
  });

  it('reativar não pede confirmação', () => {
    const { fixture, store, dialog } = setup();
    click(row(fixture, 'u2'), '[data-action="reativar"]');
    expect(dialog.open).not.toHaveBeenCalled();
    expect(store.setActive).toHaveBeenCalledWith(joao, true);
  });

  it('botões da linha em andamento ficam desabilitados', () => {
    const { fixture, store } = setup();
    store.busyId.set('u1');
    fixture.detectChanges();
    expect(row(fixture, 'u1').querySelector<HTMLButtonElement>('[data-action="desativar"]')!.disabled).toBe(true);
  });

  it('trocar senha abre o diálogo com a pessoa', () => {
    const { fixture, dialog } = setup();
    click(row(fixture, 'u1'), '[data-action="trocar-senha"]');
    expect(dialog.open).toHaveBeenCalledWith(
      PasswordDialogComponent,
      expect.objectContaining({ data: { user: maria } }),
    );
  });

  it('cadastrar recarrega a lista só quando alguém foi criado', () => {
    const created = setup({ closeWith: maria });
    click(root(created.fixture), '[data-action="cadastrar"]');
    expect(created.dialog.open).toHaveBeenCalledWith(UserFormDialogComponent, expect.anything());
    expect(created.store.load).toHaveBeenCalledTimes(2);
    TestBed.resetTestingModule();
    const cancelled = setup();
    click(root(cancelled.fixture), '[data-action="cadastrar"]');
    expect(cancelled.store.load).toHaveBeenCalledTimes(1);
  });
});
