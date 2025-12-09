import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

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
