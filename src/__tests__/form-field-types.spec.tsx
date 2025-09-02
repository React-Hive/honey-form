import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';

import { useHoneyForm } from '../hooks';

describe('Hook [use-honey-form]: String field type', () => {
  it('should only fill interactive field props for string field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    expect(result.current.formFields.name.props).toBeDefined();
    expect(result.current.formFields.name.passiveProps).toBeUndefined();
    expect(result.current.formFields.name.objectProps).toBeUndefined();
  });
});

describe('Hook [use-honey-form]: Numeric field type', () => {
  it('should only fill interactive field props for numeric field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ phone: string }>({
        fields: {
          phone: {
            type: 'numeric',
          },
        },
      }),
    );

    expect(result.current.formFields.phone.props).toBeDefined();
    expect(result.current.formFields.phone.passiveProps).toBeUndefined();
    expect(result.current.formFields.phone.objectProps).toBeUndefined();
  });

  it('should not raise an error when numeric value is empty', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ phone: string }>({
        fields: {
          phone: {
            type: 'numeric',
          },
        },
      }),
    );

    expect(result.current.formFields.phone.errors).toStrictEqual([]);

    act(() => result.current.formFields.phone.setValue(''));

    expect(result.current.formFields.phone.errors).toStrictEqual([]);
  });

  it('should not raise an error when numeric value is correct', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ phone: string }>({
        fields: {
          phone: {
            type: 'numeric',
          },
        },
      }),
    );
    expect(result.current.formFields.phone.errors).toStrictEqual([]);

    act(() => result.current.formFields.phone.setValue('12345678901234567890'));

    expect(result.current.formFields.phone.errors).toStrictEqual([]);
  });

  it('should raise an error when numeric value contains non-numeric characters', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ phone: string }>({
        fields: {
          phone: {
            type: 'numeric',
          },
        },
      }),
    );
    expect(result.current.formFields.phone.errors).toStrictEqual([]);

    act(() => result.current.formFields.phone.setValue('1a2'));

    expect(result.current.formFields.phone.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid format',
      },
    ]);
  });
});

describe('Hook [use-honey-form]: Number field type', () => {
  it('should only fill interactive field props for number field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: string }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    expect(result.current.formFields.age.props).toBeDefined();
    expect(result.current.formFields.age.passiveProps).toBeUndefined();
    expect(result.current.formFields.age.objectProps).toBeUndefined();
  });

  it('initially the number field type value should be undefined', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    expect(result.current.formFields.age.value).toBeUndefined();
    expect(result.current.formFields.age.cleanValue).toBeUndefined();
  });

  it('string value should be converted to number using number type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    act(() =>
      result.current.formFields.age.props.onChange({
        target: { value: '35' },
      } as ChangeEvent<HTMLInputElement>),
    );

    expect(result.current.formFields.age.value).toBe('35');
    expect(result.current.formFields.age.cleanValue).toBe(35);
  });

  it('empty string value should be converted to `undefined` using number type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    act(() =>
      result.current.formFields.age.props.onChange({
        target: { value: '' },
      } as ChangeEvent<HTMLInputElement>),
    );

    expect(result.current.formFields.age.value).toBe('');
    expect(result.current.formFields.age.cleanValue).toBeUndefined();
  });

  it('negative value should be allowed by default for number field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    act(() => result.current.formFields.age.setValue(-5));

    expect(result.current.formFields.age.value).toBe(-5);
    expect(result.current.formFields.age.cleanValue).toBe(-5);
    expect(result.current.formFields.age.errors).toStrictEqual([]);
  });
});

describe('Hook [use-honey-form]: Email field type', () => {
  it('should only fill interactive field props for email field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ email: string }>({
        fields: {
          email: {
            type: 'email',
          },
        },
      }),
    );

    expect(result.current.formFields.email.props).toBeDefined();
    expect(result.current.formFields.email.passiveProps).toBeUndefined();
    expect(result.current.formFields.email.objectProps).toBeUndefined();
  });

  it('should not raise an error when email is empty', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ email: string }>({
        fields: {
          email: {
            type: 'email',
          },
        },
      }),
    );

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue(''));

    expect(result.current.formFields.email.errors).toStrictEqual([]);
  });

  it('should raise an error when email is not valid', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ email: string }>({
        fields: {
          email: {
            type: 'email',
          },
        },
      }),
    );

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('abc'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);

    act(() => result.current.formFields.email.setValue('a@'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);

    act(() => result.current.formFields.email.setValue('a@g'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);

    act(() => result.current.formFields.email.setValue('a@gmail.'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);

    act(() => result.current.formFields.email.setValue('...a@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);
  });

  it('should pass email validation when email is correct', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ email: string }>({
        fields: {
          email: {
            type: 'email',
          },
        },
      }),
    );

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('a.kr@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('a+1@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('a-b@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('a_b@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([]);
  });
});

describe('Hook [use-honey-form]: Checkbox field type', () => {
  it('should only fill passive field props for checkbox field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ isAcceptTerms: boolean }>({
        fields: {
          isAcceptTerms: {
            type: 'checkbox',
          },
        },
      }),
    );

    expect(result.current.formFields.isAcceptTerms.props).toBeUndefined();
    expect(result.current.formFields.isAcceptTerms.passiveProps).toBeDefined();
    expect(result.current.formFields.isAcceptTerms.objectProps).toBeUndefined();
  });

  it('should have `checked` attribute in `passiveProps` for checkbox field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ isAcceptTerms: boolean }>({
        fields: {
          isAcceptTerms: {
            type: 'checkbox',
          },
        },
      }),
    );

    expect(result.current.formFields.isAcceptTerms.passiveProps.checked).toBeDefined();
  });
});

describe('Hook [use-honey-form]: Radio field type', () => {
  it('should only fill passive field props for radio field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ mode: string }>({
        fields: {
          mode: {
            type: 'radio',
          },
        },
      }),
    );

    expect(result.current.formFields.mode.props).toBeUndefined();
    expect(result.current.formFields.mode.passiveProps).toBeDefined();
    expect(result.current.formFields.mode.objectProps).toBeUndefined();
  });

  it('should not have `checked` attribute in `passiveProps` for radio field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ mode: string }>({
        fields: {
          mode: {
            type: 'radio',
          },
        },
      }),
    );

    expect('checked' in result.current.formFields.mode.passiveProps).toBeFalsy();
  });
});

describe('Hook [use-honey-form]: Object field type', () => {
  type Category = {
    id: number;
    name: string;
  };

  it('should only fill object field props for object field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ category: Category }>({
        fields: {
          category: {
            type: 'object',
          },
        },
      }),
    );

    expect(result.current.formFields.category.props).toBeUndefined();
    expect(result.current.formFields.category.passiveProps).toBeUndefined();
    expect(result.current.formFields.category.objectProps).toBeDefined();
  });

  it('should set a new value via the `onChange` function using `objectProps`', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ category: Category }>({
        fields: {
          category: {
            type: 'object',
          },
        },
      }),
    );

    act(() =>
      result.current.formFields.category.objectProps.onChange({
        id: 0,
        name: 'Fruits',
      }),
    );

    expect(result.current.formFields.category.value).toStrictEqual({
      id: 0,
      name: 'Fruits',
    });
  });
});
