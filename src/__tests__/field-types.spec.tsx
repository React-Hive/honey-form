import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';

import { useHoneyForm } from '../hooks';

describe('String field type', () => {
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
  });
});

describe('Numeric field type', () => {
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

describe('Number field type', () => {
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

    expect(result.current.formFields.age.displayValue).toBeUndefined();
    expect(result.current.formFields.age.normalizedValue).toBeUndefined();
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

    expect(result.current.formFields.age.displayValue).toBe('35');
    expect(result.current.formFields.age.normalizedValue).toBe(35);
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

    expect(result.current.formFields.age.displayValue).toBe('');
    expect(result.current.formFields.age.normalizedValue).toBeUndefined();
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

    expect(result.current.formFields.age.displayValue).toBe(-5);
    expect(result.current.formFields.age.normalizedValue).toBe(-5);
    expect(result.current.formFields.age.errors).toStrictEqual([]);
  });
});

describe('Email field type', () => {
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

describe('Checkbox field type', () => {
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

describe('Radio field type', () => {
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

describe('Object field type', () => {
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
  });
});
