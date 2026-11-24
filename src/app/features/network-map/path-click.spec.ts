import { pathClickAction } from './path-click';

describe('pathClickAction', () => {
  it('warns while picking elements for the cable list', () => {
    expect(pathClickAction('select', true, 'c1', 'c2')).toBe('warnPicking');
    expect(pathClickAction('select', true, 'c1', 'c1')).toBe('warnPicking');
    expect(pathClickAction('editCable', true, 'c1', 'c2')).toBe('warnPicking');
  });

  it('opens the edit on the second click and focuses another cable', () => {
    expect(pathClickAction('select', false, 'c1', 'c1')).toBe('edit');
    expect(pathClickAction('select', false, 'c1', 'c2')).toBe('focus');
    expect(pathClickAction('select', false, null, 'c2')).toBe('focus');
  });

  it('ignores the selected cable in "Mover cabo" and selects another', () => {
    expect(pathClickAction('editCable', false, 'c1', 'c1')).toBe('ignore');
    expect(pathClickAction('editCable', false, 'c1', 'c2')).toBe('select');
  });

  it('ignores the click in the creation and move tools', () => {
    expect(pathClickAction('addCable', false, null, 'c1')).toBe('ignore');
    expect(pathClickAction('addElement', false, null, 'c1')).toBe('ignore');
    expect(pathClickAction('move', false, null, 'c1')).toBe('ignore');
  });
});
