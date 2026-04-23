import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

describe('Custom field validators', () => {
  it('should call the field validator function once when the field value is set', () => {
    const validator = vitest.fn().mockReturnValue(true);

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            validator,
          },
        },
      }),
    );

    act(() => result.current.formFields.name.setValue('Apple'));

    expect(validator).toHaveBeenCalled();
  });

  it('should call the field validator function every time the field value changes (with StrictMode)', () => {
    const onValidate = vitest.fn().mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useHoneyForm<{ name: string }>({
          fields: {
            name: {
              type: 'string',
              validator: onValidate,
            },
          },
        }),
      {
        wrapper: StrictMode,
      },
    );

    act(() => result.current.formFields.name.setValue('A'));
    act(() => result.current.formFields.name.setValue('Ap'));
    act(() => result.current.formFields.name.setValue('App'));

    expect(onValidate).toHaveBeenCalledTimes(3);
  });

  it('should handle multiple field validators affecting each other', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ age1: number; age2: number; age3: number }>({
        fields: {
          age1: {
            type: 'number',
            defaultValue: 1,
            validator: (value, { formFields }) => value < formFields.age2.displayValue,
          },
          age2: {
            type: 'number',
            defaultValue: 2,
            validator: (value, { formFields }) =>
              value > formFields.age1.displayValue && value < formFields.age3.displayValue,
          },
          age3: {
            type: 'number',
            defaultValue: 3,
            validator: (value, { formFields }) => value > formFields.age2.displayValue,
          },
        },
        onSubmit,
      }),
    );

    act(() => {
      result.current.formFields.age1.setValue(2);
      result.current.formFields.age2.setValue(3);
      result.current.formFields.age3.setValue(4);
    });

    expect(result.current.formFields.age1.displayValue).toBe(2);
    expect(result.current.formFields.age2.displayValue).toBe(3);
    expect(result.current.formFields.age3.displayValue).toBe(4);

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalledWith(
      {
        age1: 2,
        age2: 3,
        age3: 4,
      },
      expect.any(Object),
    );
  });

  it('should validate the field only on form submission when mode is `submit`', async () => {
    const onSubmit = vitest.fn();
    const validator = vitest.fn().mockReturnValue(true);

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            mode: 'submit',
            validator,
          },
        },
        onSubmit,
      }),
    );

    act(() => result.current.formFields.name.setValue('Apple'));

    expect(validator).not.toHaveBeenCalled();

    await act(() => result.current.submitForm());

    expect(validator).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalled();
  });
});
