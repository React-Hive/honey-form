import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

describe('Form validation', () => {
  it('should validate the form', async () => {
    type Form = {
      name: string;
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          age: {
            type: 'number',
            required: true,
          },
        },
      }),
    );

    expect(result.current.formErrors).toStrictEqual({});

    const isFormValid = await act(() => result.current.validateForm());

    expect(isFormValid).toBeFalsy();
    expect(result.current.formErrors).toStrictEqual({
      name: [
        {
          type: 'required',
          message: 'The value is required',
        },
      ],
      age: [
        {
          type: 'required',
          message: 'The value is required',
        },
      ],
    });
  });

  it('should validate all fields when no specific target fields are provided', async () => {
    type Form = {
      name: string;
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          age: {
            type: 'number',
            required: true,
          },
        },
      }),
    );

    expect(result.current.formErrors).toStrictEqual({});

    const isFormValid = await act(() =>
      result.current.validateForm({
        targetFields: [],
      }),
    );

    expect(isFormValid).toBeFalsy();
    expect(Object.keys(result.current.formErrors).length).toBe(2);
  });

  it('should validate target form fields', async () => {
    type Form = {
      name: string;
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          age: {
            type: 'number',
            required: true,
          },
        },
      }),
    );

    expect(result.current.formErrors).toStrictEqual({});

    const isFormValid = await act(() =>
      result.current.validateForm({
        targetFields: ['name'],
      }),
    );

    expect(isFormValid).toBeFalsy();
    expect(result.current.formErrors).toStrictEqual({
      name: [
        {
          type: 'required',
          message: 'The value is required',
        },
      ],
    });
  });

  it('should not validate excluded form fields', async () => {
    type Form = {
      name: string;
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          age: {
            type: 'number',
            required: true,
          },
        },
      }),
    );

    expect(result.current.formErrors).toStrictEqual({});

    const isFormValid = await act(() =>
      result.current.validateForm({
        excludeFields: ['name'],
      }),
    );

    expect(isFormValid).toBeFalsy();
    expect(result.current.formErrors).toStrictEqual({
      age: [
        {
          type: 'required',
          message: 'The value is required',
        },
      ],
    });
  });

  it('should validate all fields when no fields are excluded', async () => {
    type Form = {
      name: string;
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          age: {
            type: 'number',
            required: true,
          },
        },
      }),
    );

    expect(result.current.formErrors).toStrictEqual({});

    const isFormValid = await act(() =>
      result.current.validateForm({
        excludeFields: [],
      }),
    );

    expect(isFormValid).toBeFalsy();
    expect(Object.keys(result.current.formErrors).length).toBe(2);
  });

  it('should not set errors when `shouldSetErrors` is false', async () => {
    type Form = {
      name: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
        },
      }),
    );

    expect(result.current.formErrors).toStrictEqual({});

    const isFormValid = await act(() =>
      result.current.validateForm({
        shouldSetErrors: false,
      }),
    );

    expect(isFormValid).toBeFalsy();
    expect(result.current.formFields.name.errors).toHaveLength(0);
    expect(result.current.formErrors).toStrictEqual({});
  });
});
