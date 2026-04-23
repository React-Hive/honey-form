import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

describe('Required field validator', () => {
  it('should check required string field type when submitting', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; age: number }>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          age: {
            type: 'string',
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'required',
        message: 'The value is required',
      },
    ]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should check required object field type when submitting', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ category: string }>({
        fields: {
          category: {
            type: 'object',
            required: true,
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.category.displayValue).toBeUndefined();
    expect(result.current.formFields.category.errors).toStrictEqual([
      {
        type: 'required',
        message: 'The value is required',
      },
    ]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should handle custom required field error message during form submission', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: true,
            errorMessages: {
              required: 'This value must be filled',
            },
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.name.displayValue).toBeUndefined();
    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'required',
        message: 'This value must be filled',
      },
    ]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should have error when empty array is not allowed', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ names: string[] }>({
        fields: {
          names: {
            type: 'object',
            required: true,
            allowEmptyArray: false,
            defaultValue: [],
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.names.displayValue).toStrictEqual([]);
    expect(result.current.formFields.names.errors).toStrictEqual([
      {
        type: 'required',
        message: 'The value is required',
      },
    ]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should pass validation when empty array is allowed', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ names: string[] }>({
        fields: {
          names: {
            type: 'object',
            required: true,
            allowEmptyArray: true,
            defaultValue: [],
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.names.displayValue).toStrictEqual([]);
    expect(result.current.formFields.names.errors).toStrictEqual([]);

    expect(onSubmit).toHaveBeenCalled();
  });
  it('should have error when array contains null and empty values are not allowed', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ names: string[] }>({
        fields: {
          names: {
            type: 'object',
            required: true,
            allowEmptyArrayValues: false,
            defaultValue: [null],
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.names.displayValue).toStrictEqual([null]);
    expect(result.current.formFields.names.errors).toStrictEqual([
      {
        type: 'required',
        message: 'The value is required',
      },
    ]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should allow null in array when empty array values are allowed', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ names: string[] }>({
        fields: {
          names: {
            type: 'object',
            required: true,
            allowEmptyArrayValues: true,
            defaultValue: [null],
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.names.displayValue).toStrictEqual([null]);
    expect(result.current.formFields.names.errors).toStrictEqual([]);

    expect(onSubmit).toHaveBeenCalled();
  });

  it('should validate dynamically required fields based on form values during submission', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ isAddNote: boolean; note: string }>({
        fields: {
          isAddNote: {
            type: 'radio',
          },
          note: {
            type: 'string',
            required: ({ formValues }) => formValues.isAddNote,
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.note.errors).toStrictEqual([]);
    onSubmit.mockReset();

    act(() => result.current.formFields.isAddNote.setValue(true));
    await act(() => result.current.submitForm());

    expect(result.current.formFields.note.errors).toStrictEqual([
      {
        type: 'required',
        message: 'The value is required',
      },
    ]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not submit and return dynamic required error message from function when name is empty', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: () => 'Required to fill',
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'required',
        message: 'Required to fill',
      },
    ]);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not submit and return static required error message string when name is empty', async () => {
    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: 'Must be filled',
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'required',
        message: 'Must be filled',
      },
    ]);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
