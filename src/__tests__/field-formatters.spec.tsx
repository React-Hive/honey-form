import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';
import { createHoneyFormNumberFormatter, createHoneyFormSplitStringFormatter } from '../formatters';
import { createHoneyFormNumericFilter } from '../filters';

describe('Formatter function', () => {
  it('should have formatted value', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ price: string }>({
        fields: {
          price: {
            type: 'string',
            formatter: value => `$${value}`,
          },
        },
      }),
    );

    act(() => result.current.formFields.price.setValue('5'));

    expect(result.current.formFields.price.rawValue).toBe('5');
    expect(result.current.formFields.price.displayValue).toBe('$5');
    expect(result.current.formFields.price.normalizedValue).toBe('5');
  });

  it('should send filtered value, but not formatted value when submitting', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ price: string }>({
        fields: {
          price: {
            type: 'string',
            filter: value => value?.replace(/\$/, ''),
            formatter: value => `$${value}`,
          },
        },
        onSubmit,
      }),
    );

    act(() => result.current.formFields.price.setValue('5'));

    await act(() => result.current.submitForm(onSubmit));

    expect(result.current.formFields.price.rawValue).toBe('5');
    expect(result.current.formFields.price.displayValue).toBe('$5');
    expect(result.current.formFields.price.normalizedValue).toBe('5');

    expect(onSubmit).toHaveBeenCalledWith({ price: '5' }, expect.any(Object));
  });

  test('submit form with normalized and not displayed values', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; price: string }>({
        fields: {
          name: {
            type: 'string',
          },
          price: {
            type: 'number',
            formatter: value => `$${value}`,
          },
        },
        onSubmit,
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('apple');
      result.current.formFields.price.setValue('15');
    });

    expect(result.current.formFields.price.rawValue).toBe('15');
    expect(result.current.formFields.price.normalizedValue).toBe(15);
    expect(result.current.formFields.price.displayValue).toBe('$15');

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalledWith({ name: 'apple', price: 15 }, expect.any(Object));
  });

  test('submit formatted value when flag `submitFormattedValue: true`', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ cardExpirationDate: string }>({
        fields: {
          cardExpirationDate: {
            type: 'string',
            submitFormattedValue: true,
            filter: createHoneyFormNumericFilter({ maxLength: 4 }),
            formatter: createHoneyFormSplitStringFormatter(2, '/'),
          },
        },
        onSubmit,
      }),
    );

    act(() => result.current.formFields.cardExpirationDate.setValue('10/29'));

    expect(result.current.formFields.cardExpirationDate.displayValue).toBe('10/29');

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalledWith({ cardExpirationDate: '10/29' }, expect.any(Object));
  });
});

describe('Use predefined string formatter for segments', () => {
  it('should split passed value by equal 4 characters segments', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ cardNumber: string }>({
        fields: {
          cardNumber: {
            type: 'string',
            formatter: createHoneyFormSplitStringFormatter(4),
          },
        },
      }),
    );

    act(() => result.current.formFields.cardNumber.setValue(''));

    expect(result.current.formFields.cardNumber.displayValue).toBe('');

    act(() => result.current.formFields.cardNumber.setValue('1'));

    expect(result.current.formFields.cardNumber.displayValue).toBe('1');

    act(() => result.current.formFields.cardNumber.setValue('1111'));

    expect(result.current.formFields.cardNumber.displayValue).toBe('1111');

    act(() => result.current.formFields.cardNumber.setValue('11111'));

    expect(result.current.formFields.cardNumber.displayValue).toBe('1111 1');

    act(() => result.current.formFields.cardNumber.setValue('1111111111111111'));

    expect(result.current.formFields.cardNumber.displayValue).toBe('1111 1111 1111 1111');
  });
});

describe('Use predefined number formatter', () => {
  it('correctly formats and filters input values', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ amount: string }>({
        fields: {
          amount: {
            type: 'string',
            formatter: createHoneyFormNumberFormatter(),
          },
        },
      }),
    );

    act(() => result.current.formFields.amount.setValue(''));

    expect(result.current.formFields.amount.displayValue).toBe('');

    act(() => result.current.formFields.amount.setValue('1.'));

    expect(result.current.formFields.amount.displayValue).toBe('1.00');

    act(() => result.current.formFields.amount.setValue('.'));

    expect(result.current.formFields.amount.displayValue).toBe('');

    act(() => result.current.formFields.amount.setValue('.0'));

    expect(result.current.formFields.amount.displayValue).toBe('.00');

    act(() => result.current.formFields.amount.setValue('1'));

    expect(result.current.formFields.amount.displayValue).toBe('1.00');

    act(() => result.current.formFields.amount.setValue('1.0'));

    expect(result.current.formFields.amount.displayValue).toBe('1.00');

    act(() => result.current.formFields.amount.setValue('1.00'));

    expect(result.current.formFields.amount.displayValue).toBe('1.00');

    act(() => result.current.formFields.amount.setValue('1.0013'));

    expect(result.current.formFields.amount.displayValue).toBe('1.00');

    act(() => result.current.formFields.amount.setValue('1.2'));

    expect(result.current.formFields.amount.displayValue).toBe('1.20');

    act(() => result.current.formFields.amount.setValue('1.23'));

    expect(result.current.formFields.amount.displayValue).toBe('1.23');

    act(() => result.current.formFields.amount.setValue('-12'));

    expect(result.current.formFields.amount.displayValue).toBe('-12.00');
  });
});
