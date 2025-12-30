import { act, renderHook } from '@testing-library/react';
import { useHoneyForm } from '../hooks';
import { createHoneyFormNumberFilter, createHoneyFormNumericFilter } from '../filters';

describe('Builtin filtering', () => {
  it('should trim all spaces from the begging', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    act(() => result.current.formFields.name.setValue(' '));

    expect(result.current.formFields.name.rawValue).toBe('');
    expect(result.current.formFields.name.displayValue).toBe('');
    expect(result.current.formFields.name.normalizedValue).toBe('');

    act(() => result.current.formFields.name.setValue(' a'));

    expect(result.current.formFields.name.rawValue).toBe('a');
    expect(result.current.formFields.name.displayValue).toBe('a');
    expect(result.current.formFields.name.normalizedValue).toBe('a');

    act(() => result.current.formFields.name.setValue(' a '));

    expect(result.current.formFields.name.rawValue).toBe('a ');
    expect(result.current.formFields.name.displayValue).toBe('a ');
    expect(result.current.formFields.name.normalizedValue).toBe('a ');
  });
});

describe('Filter as a function', () => {
  it('should filter the default field value', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: string }>({
        fields: {
          age: {
            type: 'string',
            defaultValue: '1abc3',
            filter: value => value.replace(/[^0-9]/g, ''),
          },
        },
      }),
    );

    expect(result.current.formFields.age.displayValue).toBe('13');
    expect(result.current.formFields.age.normalizedValue).toBe('13');
  });

  it('should filter the field value when updated', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: string }>({
        fields: {
          age: {
            type: 'string',
            filter: value => value?.replace(/[^0-9]/g, ''),
          },
        },
      }),
    );

    act(() => result.current.formFields.age.setValue('a12b'));

    expect(result.current.formFields.age.displayValue).toBe('12');
    expect(result.current.formFields.age.normalizedValue).toBe('12');
  });

  it('should send filtered value when submitting', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            filter: value => value?.replace(/[0-9]/g, ''),
          },
        },
        onSubmit,
      }),
    );

    act(() => result.current.formFields.name.setValue('A1pple3'));

    await act(() => result.current.submitForm(onSubmit));

    expect(result.current.formFields.name.displayValue).toBe('Apple');
    expect(result.current.formFields.name.normalizedValue).toBe('Apple');

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Apple' }, { context: undefined });
  });
});

describe('Use predefined numeric filter', () => {
  it('should remove non-numeric characters from passed value and limit the length', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ price: string }>({
        fields: {
          price: {
            type: 'string',
            filter: createHoneyFormNumericFilter({ maxLength: 5 }),
          },
        },
      }),
    );

    act(() => result.current.formFields.price.setValue(''));

    expect(result.current.formFields.price.displayValue).toBe('');

    act(() => result.current.formFields.price.setValue('11'));

    expect(result.current.formFields.price.displayValue).toBe('11');

    act(() => result.current.formFields.price.setValue('a'));

    expect(result.current.formFields.price.displayValue).toBe('');

    act(() => result.current.formFields.price.setValue(' -.!g%$#*&@'));

    expect(result.current.formFields.price.displayValue).toBe('');

    act(() => result.current.formFields.price.setValue('123456789'));

    expect(result.current.formFields.price.displayValue).toBe('12345');

    act(() => result.current.formFields.price.setValue('00'));

    expect(result.current.formFields.price.displayValue).toBe('00');
  });
});

describe('Use predefined number filter', () => {
  it('should remove non-numeric characters and limit length to max length', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ amount: string }>({
        fields: {
          amount: {
            type: 'string',
            filter: createHoneyFormNumberFilter({ maxLengthBeforeDecimal: 5 }),
          },
        },
      }),
    );

    act(() => result.current.formFields.amount.setValue(''));

    expect(result.current.formFields.amount.displayValue).toBe('');

    act(() => result.current.formFields.amount.setValue('1'));

    expect(result.current.formFields.amount.displayValue).toBe('1');

    act(() => result.current.formFields.amount.setValue('a'));

    expect(result.current.formFields.amount.displayValue).toBe('');

    act(() => result.current.formFields.amount.setValue(' -.!g%$#*&@'));

    // Allow negative values (char "-")
    expect(result.current.formFields.amount.displayValue).toBe('-.');

    act(() => result.current.formFields.amount.setValue('123456789'));

    expect(result.current.formFields.amount.displayValue).toBe('12345');

    act(() => result.current.formFields.amount.setValue('-123456789'));

    expect(result.current.formFields.amount.displayValue).toBe('-12345');

    act(() => result.current.formFields.amount.setValue('00'));

    expect(result.current.formFields.amount.displayValue).toBe('0');

    act(() => result.current.formFields.amount.setValue('-00'));

    expect(result.current.formFields.amount.displayValue).toBe('-0');

    act(() => result.current.formFields.amount.setValue('002'));

    expect(result.current.formFields.amount.displayValue).toBe('2');
  });

  it('should correctly format and filter decimal numbers', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ amount: string }>({
        fields: {
          amount: {
            type: 'number',
            filter: createHoneyFormNumberFilter({ maxLengthBeforeDecimal: 3 }),
          },
        },
      }),
    );

    act(() => result.current.formFields.amount.setValue(''));

    expect(result.current.formValues.amount).toBe('');

    act(() => result.current.formFields.amount.setValue('.'));

    expect(result.current.formValues.amount).toBe('.');

    act(() => result.current.formFields.amount.setValue('..'));

    expect(result.current.formValues.amount).toBe('.');

    act(() => result.current.formFields.amount.setValue('.1'));

    expect(result.current.formValues.amount).toBe('.1');

    act(() => result.current.formFields.amount.setValue('1'));

    expect(result.current.formValues.amount).toBe('1');

    act(() => result.current.formFields.amount.setValue('12356'));

    expect(result.current.formValues.amount).toBe('123');

    act(() => result.current.formFields.amount.setValue('1.'));

    expect(result.current.formValues.amount).toBe('1.');

    act(() => result.current.formFields.amount.setValue('1.2'));

    expect(result.current.formValues.amount).toBe('1.2');

    act(() => result.current.formFields.amount.setValue('1.23'));

    expect(result.current.formValues.amount).toBe('1.23');

    act(() => result.current.formFields.amount.setValue('1.235'));

    expect(result.current.formValues.amount).toBe('1.23');

    act(() => result.current.formFields.amount.setValue('16245.235'));

    expect(result.current.formValues.amount).toBe('162.23');

    act(() => result.current.formFields.amount.setValue('0003.5'));

    expect(result.current.formFields.amount.displayValue).toBe('3.5');

    act(() => result.current.formFields.amount.setValue('1--'));

    expect(result.current.formValues.amount).toBe('1');
  });

  it('should correctly format and filter negative decimal numbers', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ amount: string }>({
        fields: {
          amount: {
            type: 'number',
            filter: createHoneyFormNumberFilter({ maxLengthBeforeDecimal: 3 }),
          },
        },
      }),
    );

    act(() => result.current.formFields.amount.setValue('-1.'));

    expect(result.current.formValues.amount).toBe('-1.');

    act(() => result.current.formFields.amount.setValue('-.1'));

    expect(result.current.formValues.amount).toBe('-.1');

    act(() => result.current.formFields.amount.setValue('-1-'));

    expect(result.current.formValues.amount).toBe('-1');

    act(() => result.current.formFields.amount.setValue('--1'));

    expect(result.current.formValues.amount).toBe('-1');

    act(() => result.current.formFields.amount.setValue('-16245.235'));

    expect(result.current.formValues.amount).toBe('-162.23');
  });

  it('should filter out non-integer characters and leading zeros when decimal is not allowed', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ amount: string }>({
        fields: {
          amount: {
            type: 'number',
            filter: createHoneyFormNumberFilter({ decimal: false }),
          },
        },
      }),
    );

    act(() => result.current.formFields.amount.setValue('.'));

    expect(result.current.formValues.amount).toBe('');

    act(() => result.current.formFields.amount.setValue('1.'));

    expect(result.current.formValues.amount).toBe('1');

    act(() => result.current.formFields.amount.setValue('.1'));

    expect(result.current.formValues.amount).toBe('1');

    act(() => result.current.formFields.amount.setValue('0'));

    expect(result.current.formValues.amount).toBe('0');

    act(() => result.current.formFields.amount.setValue('00'));

    expect(result.current.formValues.amount).toBe('0');

    act(() => result.current.formFields.amount.setValue('001'));

    expect(result.current.formValues.amount).toBe('1');
  });

  it('should format numbers with thousands separators correctly', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ amount: string }>({
        fields: {
          amount: {
            type: 'number',
            filter: createHoneyFormNumberFilter({ splitThousands: true }),
          },
        },
      }),
    );

    act(() => result.current.formFields.amount.setValue(''));

    expect(result.current.formValues.amount).toBe('');
    expect(result.current.formFields.amount.normalizedValue).toBe(undefined);

    act(() => result.current.formFields.amount.setValue('1'));

    expect(result.current.formValues.amount).toBe('1');
    expect(result.current.formFields.amount.normalizedValue).toBe(1);

    act(() => result.current.formFields.amount.setValue('1000'));

    expect(result.current.formValues.amount).toBe('1,000');
    expect(result.current.formFields.amount.normalizedValue).toBe(1000);

    act(() => result.current.formFields.amount.setValue('100000'));

    expect(result.current.formValues.amount).toBe('100,000');
    expect(result.current.formFields.amount.normalizedValue).toBe(100000);

    act(() => result.current.formFields.amount.setValue('1000000'));

    expect(result.current.formValues.amount).toBe('1,000,000');
    expect(result.current.formFields.amount.normalizedValue).toBe(1000000);

    act(() => result.current.formFields.amount.setValue('-1000'));

    expect(result.current.formValues.amount).toBe('-1,000');
    expect(result.current.formFields.amount.normalizedValue).toBe(-1000);
  });
});
