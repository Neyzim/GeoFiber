import { FormControl, FormGroup } from '@angular/forms';
import { applyFieldErrors } from './form-errors';

describe('applyFieldErrors', () => {
  it('marks known fields and returns the messages of unknown ones', () => {
    const form = new FormGroup({ name: new FormControl('') });

    const unmatched = applyFieldErrors(form, { name: 'obrigatório', location: 'inválida' });

    const name = form.get('name')!;
    expect(name.errors).toEqual(expect.objectContaining({ api: 'obrigatório' }));
    expect(name.touched).toBe(true);
    expect(unmatched).toEqual(['inválida']);
  });
});
