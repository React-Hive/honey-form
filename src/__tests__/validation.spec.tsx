import { act, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';

import { useHoneyForm } from '../hooks';

describe('Min/Max field validator', () => {
  it('should validate field value against minimum value constraint', () => {
    type Form = {
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          age: {
            type: 'number',
            min: 5,
          },
        },
      }),
    );

    expect(result.current.formFields.age.errors).toStrictEqual([]);

    act(() => result.current.formFields.age.setValue(5));

    expect(result.current.formFields.age.errors).toStrictEqual([]);

    act(() => result.current.formFields.age.setValue(4));

    expect(result.current.formFields.age.errors).toStrictEqual([
      {
        type: 'min',
        message: 'The value must be greater than or equal to 5',
      },
    ]);
  });

  it('should validate text field against dynamic min length constraint', async () => {
    type Form = {
      text: string;
      minLength: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          minLength: {
            type: 'number',
            defaultValue: 1,
            onChange: (_, { formFields }) => formFields.text.validate(),
          },
          text: {
            type: 'string',
            min: ({ formValues, formFields }) =>
              formValues.minLength ?? formFields.minLength.defaultValue,
          },
        },
      }),
    );

    expect(result.current.formFields.text.errors).toStrictEqual([]);

    act(() => result.current.formFields.text.setValue('a'));

    expect(result.current.formFields.text.errors).toStrictEqual([]);

    act(() => result.current.formFields.minLength.setValue(2));

    await waitFor(() =>
      expect(result.current.formFields.text.errors).toStrictEqual([
        {
          type: 'min',
          message: 'The length must be greater than or equal to 2 characters',
        },
      ]),
    );
  });

  it('should validate field value against maximum value constraint', () => {
    type Form = {
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          age: {
            type: 'number',
            max: 65,
          },
        },
      }),
    );

    expect(result.current.formFields.age.errors).toStrictEqual([]);

    act(() => result.current.formFields.age.setValue(65));

    expect(result.current.formFields.age.errors).toStrictEqual([]);

    act(() => result.current.formFields.age.setValue(70));

    expect(result.current.formFields.age.errors).toStrictEqual([
      {
        type: 'max',
        message: 'The value must be less than or equal to 65',
      },
    ]);
  });

  it('should validate text field against dynamic max length constraint', async () => {
    type Form = {
      text: string;
      maxLength: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          maxLength: {
            type: 'number',
            defaultValue: 3,
            onChange: (_, { formFields }) => formFields.text.validate(),
          },
          text: {
            type: 'string',
            max: ({ formValues, formFields }) =>
              formValues.maxLength ?? formFields.maxLength.defaultValue,
          },
        },
      }),
    );

    expect(result.current.formFields.text.errors).toStrictEqual([]);

    act(() => result.current.formFields.text.setValue('abc'));

    expect(result.current.formFields.text.errors).toStrictEqual([]);

    act(() => result.current.formFields.maxLength.setValue(2));

    await waitFor(() =>
      expect(result.current.formFields.text.errors).toStrictEqual([
        {
          type: 'max',
          message: 'The length must be less than or equal to 2 characters',
        },
      ]),
    );
  });

  it('should submit form when field is optional with set max value', async () => {
    type Form = {
      weight: number;
    };

    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          weight: {
            type: 'number',
            max: 15,
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalledWith({ weight: undefined }, expect.any(Object));
  });

  it('should validate field value against both minimum and maximum value constraints', () => {
    type Form = {
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          age: {
            type: 'number',
            min: 5,
            max: 65,
          },
        },
      }),
    );

    expect(result.current.formFields.age.errors).toStrictEqual([]);

    act(() => result.current.formFields.age.setValue(70));

    expect(result.current.formFields.age.errors).toStrictEqual([
      {
        type: 'minMax',
        message: 'The value must be between 5 and 65',
      },
    ]);
  });

  it('should validate min and max value constraints using `onChange` callback', () => {
    type Form = {
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          age: {
            type: 'number',
            min: 5,
            max: 65,
          },
        },
      }),
    );

    expect(result.current.formFields.age.errors).toStrictEqual([]);

    act(() =>
      result.current.formFields.age.props.onChange({
        target: { value: '78' },
      } as ChangeEvent<HTMLInputElement>),
    );

    expect(result.current.formFields.age.errors).toStrictEqual([
      {
        type: 'minMax',
        message: 'The value must be between 5 and 65',
      },
    ]);
  });

  it('should validate min length for string field', () => {
    type Form = {
      name: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            min: 2,
          },
        },
      }),
    );

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('12'));

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('1'));

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'min',
        message: 'The length must be greater than or equal to 2 characters',
      },
    ]);
  });

  it('should validate max length for string field', () => {
    type Form = {
      name: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            max: 5,
          },
        },
      }),
    );

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('A'));

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('Antonio'));

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'max',
        message: 'The length must be less than or equal to 5 characters',
      },
    ]);
  });

  it('should validate max length for email field', () => {
    type Form = {
      email: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          email: {
            type: 'email',
            max: 15,
          },
        },
      }),
    );

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('A12@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('A12345@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'max',
        message: 'The length must be less than or equal to 15 characters',
      },
    ]);
  });

  it('should submit form when field is optional with set max length', async () => {
    type Form = {
      name: string;
    };

    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            max: 5,
          },
        },
        onSubmit,
      }),
    );

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalledWith({ name: undefined }, expect.any(Object));
  });

  it('should validate min and max length for string field', () => {
    type Form = {
      name: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            min: 1,
            max: 5,
          },
        },
      }),
    );

    expect(result.current.formFields.name.errors).toStrictEqual([]);

    act(() => result.current.formFields.name.setValue('Antonio'));

    expect(result.current.formFields.name.errors).toStrictEqual([
      {
        type: 'minMax',
        message: 'The length must be between 1 and 5 characters',
      },
    ]);
  });

  it('should validate equal min and max length for string field', () => {
    type Form = {
      code: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          code: {
            type: 'string',
            min: 5,
            max: 5,
          },
        },
      }),
    );

    expect(result.current.formFields.code.errors).toStrictEqual([]);

    act(() => result.current.formFields.code.setValue('A81J'));

    expect(result.current.formFields.code.errors).toStrictEqual([
      {
        type: 'minMax',
        message: 'The length must be exactly 5 characters',
      },
    ]);
  });

  it('should prioritize numeric-only error over min/max error', async () => {
    type Form = {
      age: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          age: {
            type: 'number',
            min: 18,
            max: 100,
          },
        },
      }),
    );

    act(() => result.current.formFields.age.setValue(1.5));

    expect(result.current.formFields.age.errors).toStrictEqual([
      {
        message: 'Only numerics are allowed',
        type: 'invalid',
      },
    ]);
  });
});

describe('Work with after form validate callback function', () => {
  it('should invoke `onAfterValidate` callback when form validation passes without errors', async () => {
    type Form = {
      name: string;
    };

    const onAfterValidate = vitest.fn().mockResolvedValue(null);

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
        },
        onAfterValidate,
        onSubmit: vitest.fn(),
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.name.errors).toHaveLength(0);
    expect(onAfterValidate).toHaveBeenCalled();
  });

  it('should invoke `onAfterValidate` callback when form validation fails with errors', async () => {
    type Form = {
      name: string;
    };

    const onAfterValidate = vitest.fn().mockResolvedValue(null);

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
        },
        onAfterValidate,
        onSubmit: vitest.fn(),
      }),
    );

    await act(() => result.current.submitForm());

    expect(result.current.formFields.name.errors).toHaveLength(1);
    expect(onAfterValidate).toHaveBeenCalled();
  });
});
