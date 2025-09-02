import { act, renderHook } from '@testing-library/react';
import { useHoneyForm } from '../hooks';

describe('Hook [use-honey-form]: Form context', () => {
  it('should use `allowedNames` configuration from the context in validator function', () => {
    type FormData = {
      name: string;
    };

    type FormContext = {
      allowedNames: string[];
    };

    const { result } = renderHook(() =>
      useHoneyForm<FormData, FormContext>({
        fields: {
          name: {
            type: 'string',
            validator: (value, { formContext }) => formContext.allowedNames.includes(value),
          },
        },
        context: {
          allowedNames: ['Apple'],
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Apple');
    });

    expect(result.current.formFields.name.value).toBe('Apple');
    expect(result.current.formErrors).toStrictEqual({});
  });

  it('should use `maxStrLength` configuration from the context in filter function', () => {
    type FormData = {
      name: string;
    };

    type FormContext = {
      maxStrLength: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<FormData, FormContext>({
        fields: {
          name: {
            type: 'string',
            filter: (value, { formContext }) => value?.slice(0, formContext.maxStrLength),
          },
        },
        context: {
          maxStrLength: 5,
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Apple123');
    });

    expect(result.current.formFields.name.value).toBe('Apple');
    expect(result.current.formErrors).toStrictEqual({});
  });

  it('should use `currencySign` configuration from the context in format function', () => {
    type FormData = {
      price: string;
    };

    type FormContext = {
      currencySign: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<FormData, FormContext>({
        fields: {
          price: {
            type: 'string',
            formatter: (value, { formContext }) => `${formContext.currencySign}${value}`,
          },
        },
        context: {
          currencySign: '$',
        },
      }),
    );

    act(() => {
      result.current.formFields.price.setValue('15');
    });

    expect(result.current.formFields.price.value).toBe('$15');
    expect(result.current.formErrors).toStrictEqual({});
  });
});
