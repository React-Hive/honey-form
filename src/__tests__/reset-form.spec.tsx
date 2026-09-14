import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';
import { defer } from '../tests.helpers';

describe('Reset form', () => {
  it('should reset to initial field values', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; age: string }>({
        fields: {
          name: {
            type: 'string',
            defaultValue: 'Alex',
          },
          age: {
            type: 'string',
            defaultValue: '45',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Dima');
      result.current.formFields.age.setValue('47');
    });

    expect(result.current.formValues).toStrictEqual({
      name: 'Dima',
      age: '47',
    });

    act(() => result.current.resetForm());

    expect(result.current.formValues).toStrictEqual({
      name: 'Alex',
      age: '45',
    });
  });

  it('should clear form and field errors after form reset', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
        },
      }),
    );

    act(() => result.current.formFields.name.setValue('Apple'));

    expect(result.current.formValues.name).toBe('Apple');

    act(() => result.current.resetForm());

    expect(result.current.formValues.name).toBe(undefined);

    expect(result.current.formErrors).toStrictEqual({});
    expect(result.current.formFields.name.errors).toStrictEqual([]);
  });

  it('should restore default null value after reset', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ startDate: Date }>({
        fields: {
          startDate: {
            type: 'object',
          },
        },
        defaults: {
          startDate: null,
        },
      }),
    );

    const startDate = new Date();

    act(() => result.current.formFields.startDate.setValue(startDate));

    expect(result.current.formValues.startDate).toBe(startDate);

    act(() => result.current.resetForm());

    expect(result.current.formValues.startDate).toBe(null);
  });

  it('should set new default values when resetting the form', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; price: string }>({
        fields: {
          name: {
            type: 'string',
          },
          price: {
            type: 'string',
          },
        },
        defaults: {
          name: 'Product',
          price: '10',
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Lemon');
      result.current.formFields.price.setValue('7');
    });

    act(() =>
      result.current.resetForm({
        name: 'Pear',
        price: '5',
      }),
    );

    expect(result.current.formDefaultValues).toStrictEqual({
      name: 'Pear',
      price: '5',
    });

    expect(result.current.formValues).toStrictEqual({
      name: 'Pear',
      price: '5',
    });
  });
});

describe('Reset field value', () => {
  type Form = {
    name: string;
    age: number;
  };

  const renderForm = () =>
    renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            required: true,
            defaultValue: 'Apple',
          },
          age: {
            type: 'number',
            defaultValue: 30,
          },
        },
      }),
    );

  it('should reset the field to its default value and clear errors', () => {
    const { result } = renderForm();

    act(() => result.current.formFields.name.setValue(''));

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'required',
        message: 'The value is required',
      },
    ]);
    expect(result.current.formFields.name.isDirty).toBeTruthy();

    act(() => result.current.formFields.name.resetValue());

    expect(result.current.formFields.name.displayValue).toBe('Apple');
    expect(result.current.formFields.name.props.value).toBe('Apple');
    expect(result.current.formFields.name.errors).toStrictEqual([]);
    expect(result.current.formFields.name.isDirty).toBeFalsy();
  });

  it('should reset the field to a new default value', () => {
    const { result } = renderForm();

    act(() => result.current.formFields.name.setValue('Banana'));

    act(() => result.current.formFields.name.resetValue({ defaultValue: 'Cherry' }));

    expect(result.current.formFields.name.displayValue).toBe('Cherry');
    expect(result.current.formFields.name.normalizedValue).toBe('Cherry');
    expect(result.current.formFields.name.defaultValue).toBe('Cherry');
    expect(result.current.formFields.name.config.defaultValue).toBe('Cherry');
    expect(result.current.formFields.name.errors).toStrictEqual([]);
    expect(result.current.formFields.name.isDirty).toBeFalsy();

    expect(result.current.formDefaultValues).toStrictEqual({
      name: 'Cherry',
      age: 30,
    });

    // The next reset without options must use the new default value
    act(() => result.current.formFields.name.setValue('Banana'));

    expect(result.current.formFields.name.isDirty).toBeTruthy();

    act(() => result.current.formFields.name.resetValue());

    expect(result.current.formFields.name.displayValue).toBe('Cherry');
    expect(result.current.formFields.name.isDirty).toBeFalsy();
  });

  it('should reset a number field to a new default value', () => {
    const { result } = renderForm();

    act(() => result.current.formFields.age.setValue(40));

    act(() => result.current.formFields.age.resetValue({ defaultValue: 50 }));

    expect(result.current.formFields.age.displayValue).toBe(50);
    expect(result.current.formFields.age.normalizedValue).toBe(50);
    expect(result.current.formFields.age.props.value).toBe('50');
    expect(result.current.formFields.age.isDirty).toBeFalsy();
  });

  it('should support a lazy new default value', () => {
    const { result } = renderForm();

    const defaultValue = vitest.fn(() => 'Lazy');

    act(() => result.current.formFields.name.resetValue({ defaultValue }));

    expect(defaultValue).toHaveBeenCalled();

    expect(result.current.formFields.name.displayValue).toBe('Lazy');
    expect(result.current.formFields.name.defaultValue).toBe('Lazy');
    // The factory itself is kept in the config, so every reset produces a fresh value
    expect(result.current.formFields.name.config.defaultValue).toBe(defaultValue);
    expect(result.current.formDefaultValues.name).toBe('Lazy');
    expect(result.current.formFields.name.isDirty).toBeFalsy();
  });

  it('should clear the default value when `undefined` is passed explicitly', () => {
    const { result } = renderForm();

    act(() => result.current.formFields.age.resetValue({ defaultValue: undefined }));

    expect(result.current.formFields.age.displayValue).toBeUndefined();
    expect(result.current.formFields.age.props.value).toBe('');
    expect(result.current.formFields.age.defaultValue).toBeUndefined();
    expect(result.current.formDefaultValues.age).toBeUndefined();
    expect(result.current.formFields.age.isDirty).toBeFalsy();
  });

  it('should use the new field default value when the form is reset afterwards', () => {
    const { result } = renderForm();

    act(() => result.current.formFields.name.resetValue({ defaultValue: 'Cherry' }));
    act(() => result.current.formFields.name.setValue('Banana'));

    act(() => result.current.resetForm());

    expect(result.current.formFields.name.displayValue).toBe('Cherry');
    expect(result.current.formFields.age.displayValue).toBe(30);
  });
});

describe('Reset field value without validation', () => {
  it('should not validate the field on reset', async () => {
    const validator = vitest.fn(() => true);

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: true,
            validator,
          },
        },
      }),
    );

    act(() => result.current.formFields.name.setValue(''));

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'required',
        message: 'The value is required',
      },
    ]);

    validator.mockClear();

    act(() => result.current.formFields.name.resetValue());

    expect(validator).not.toHaveBeenCalled();
    expect(result.current.formFields.name.displayValue).toBeUndefined();
    expect(result.current.formFields.name.errors).toStrictEqual([]);
    expect(result.current.formFields.name.props['aria-invalid']).toBeFalsy();
    expect(result.current.formFields.name.isDirty).toBeFalsy();

    // The form validation still applies the rules afterwards
    await act(() => result.current.validateForm());

    expect(validator).toHaveBeenCalledTimes(1);
    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'required',
        message: 'The value is required',
      },
    ]);
  });

  it('should reset a required field to an empty default without errors or dirty state', async () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: true,
            defaultValue: 'Apple',
          },
        },
      }),
    );

    act(() => result.current.formFields.name.setValue('Banana'));

    act(() => result.current.formFields.name.resetValue({ defaultValue: '' }));

    expect(result.current.formFields.name.displayValue).toBe('');
    expect(result.current.formFields.name.normalizedValue).toBe('');
    expect(result.current.formFields.name.errors).toStrictEqual([]);
    expect(result.current.formFields.name.isDirty).toBeFalsy();
    expect(result.current.formDefaultValues.name).toBe('');

    // The empty default is still rejected by the `required` rule when the form is validated
    await act(() => result.current.validateForm());

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'required',
        message: 'The value is required',
      },
    ]);
    // The value still equals the default, so the field is not dirty
    expect(result.current.formFields.name.isDirty).toBeFalsy();
  });

  it('should abort an in-flight async validation on reset', async () => {
    let capturedSignal: AbortSignal | undefined;

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            defaultValue: 'Apple',
            validator: (_, { signal }) => {
              capturedSignal = signal;

              // Validators are expected to honor the signal: an aborted run passes instead of reporting
              return defer(() => (signal.aborted ? true : 'Too late'), 20);
            },
          },
        },
      }),
    );

    act(() => result.current.formFields.name.setValue('Banana'));

    expect(result.current.formFields.name.isValidating).toBeTruthy();
    expect(result.current.formFields.name.props['aria-busy']).toBeTruthy();

    act(() => result.current.formFields.name.resetValue());

    expect(capturedSignal?.aborted).toBeTruthy();
    expect(result.current.formFields.name.isValidating).toBeFalsy();
    expect(result.current.formFields.name.props['aria-busy']).toBeFalsy();
    expect(result.current.formFields.name.displayValue).toBe('Apple');

    // Let the aborted validation settle
    await act(() => defer(() => undefined, 40));

    expect(result.current.formFields.name.errors).toStrictEqual([]);
    expect(result.current.formFields.name.isValidating).toBeFalsy();
  });
});
