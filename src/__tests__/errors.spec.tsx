import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

describe('Hook [use-honey-form]: Work with errors', () => {
  it('should initialize with empty errors object and no form errors', () => {
    const { result } = renderHook(() => useHoneyForm({ fields: {} }));

    expect(result.current.formErrors).toStrictEqual({});
    expect(result.current.isFormErred).toBeFalsy();
  });

  it('should not have an error for a newly declared field', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    expect(result.current.formErrors.name).toBeUndefined();
  });

  it('should not allow decimal values for number type by default', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    act(() => result.current.formFields.age.setValue(1.5));

    expect(result.current.formFields.age.value).toBe(1.5);
    expect(result.current.formFields.age.cleanValue).toBeUndefined();

    expect(result.current.isFormErred).toBeTruthy();
    expect(result.current.formErrors).toStrictEqual({
      age: [
        {
          message: 'Only numerics are allowed',
          type: 'invalid',
        },
      ],
    });
  });

  it('should not allow decimal values for number type with custom validator', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
            validator: value => value > 18 && value < 100,
          },
        },
      }),
    );

    act(() => result.current.formFields.age.setValue(1.5));

    expect(result.current.formFields.age.value).toBe(1.5);
    expect(result.current.formFields.age.cleanValue).toBeUndefined();

    expect(result.current.formErrors).toStrictEqual({
      age: [
        {
          message: 'Only numerics are allowed',
          type: 'invalid',
        },
      ],
    });
  });

  it('should use custom errors returned from field validator', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'string',
            validator: value =>
              value > 45 || [
                {
                  type: 'invalid',
                  message: 'Age should be greater than 45',
                },
              ],
          },
        },
      }),
    );

    expect(result.current.formFields.age.errors).toStrictEqual([]);

    act(() => result.current.formFields.age.setValue(43));

    expect(result.current.formFields.age.value).toBe(43);
    expect(result.current.formFields.age.cleanValue).toBeUndefined();

    expect(result.current.formFields.age.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Age should be greater than 45',
      },
    ]);

    act(() => result.current.formFields.age.setValue(46));

    expect(result.current.formFields.age.value).toBe(46);
    expect(result.current.formFields.age.cleanValue).toBe(46);

    expect(result.current.formFields.age.errors).toStrictEqual([]);
  });

  it('should add and clear server error for an existing field', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'string',
          },
        },
      }),
    );
    expect(result.current.formFields.age.errors).toStrictEqual([]);

    act(() =>
      result.current.addFormFieldError('age', {
        type: 'server',
        message: 'age should be less than 55',
      }),
    );

    expect(result.current.formFields.age.errors).toStrictEqual([
      {
        message: 'age should be less than 55',
        type: 'server',
      },
    ]);

    act(() => result.current.formFields.age.clearErrors());

    expect(result.current.formFields.age.errors).toStrictEqual([]);
  });

  it('should add server error to non-existing field', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'string',
          },
        },
      }),
    );

    act(() => {
      // there are some cases when the form can have alien field errors when the server can return non-existed form fields
      result.current.addFormFieldError('name' as never, {
        type: 'server',
        message: 'name should be less than 255',
      });
    });

    expect(result.current.formErrors).toStrictEqual({
      name: [
        {
          type: 'server',
          message: 'name should be less than 255',
        },
      ],
    });
  });

  it('should ignore server errors during submission', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
        onSubmit,
      }),
    );

    act(() =>
      result.current.setFormErrors({
        name: [
          {
            type: 'server',
            message: 'Apple is not allowed',
          },
        ],
      }),
    );

    expect(result.current.formErrors).toStrictEqual({
      name: [
        {
          type: 'server',
          message: 'Apple is not allowed',
        },
      ],
    });

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalled();
    // The errors should be cleared because the submit handler does not return the new server errors
    expect(result.current.formErrors).toStrictEqual({});
  });

  it('should set server errors as the result of form submission', async () => {
    const onSubmit = jest
      .fn()
      .mockResolvedValueOnce(
        Promise.resolve({
          name: ['Apple is not allowed', 'The name should not be fruit'],
        }),
      )
      .mockResolvedValueOnce(Promise.resolve({}));

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
        onSubmit,
      }),
    );

    act(() => result.current.formFields.name.setValue('Apple'));

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalled();
    expect(result.current.formErrors).toStrictEqual({
      name: [
        {
          type: 'server',
          message: 'Apple is not allowed',
        },
        {
          type: 'server',
          message: 'The name should not be fruit',
        },
      ],
    });
  });
});
