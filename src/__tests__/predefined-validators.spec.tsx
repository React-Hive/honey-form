import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';
import { createHoneyFormDateFromValidator, createHoneyFormDateToValidator } from '../validators';
import type { CustomDateRangeForm } from '../types';

describe('Predefined validators', () => {
  it('should validate date range correctly', () => {
    type DateRangeForm = CustomDateRangeForm<'fromDate', 'toDate'>;

    const { result } = renderHook(() =>
      useHoneyForm<DateRangeForm>({
        fields: {
          fromDate: {
            type: 'object',
            // <DateRangeForm, 'fromDate', 'toDate'> as an example how it can be used with any additional properties like `name: string`
            validator: createHoneyFormDateFromValidator<
              DateRangeForm,
              undefined,
              'fromDate',
              'toDate'
            >({
              dateToKey: 'toDate',
            }),
          },
          toDate: {
            type: 'object',
            validator: createHoneyFormDateToValidator({
              dateFromKey: 'fromDate',
            }),
          },
        },
      }),
    );

    act(() => result.current.formFields.fromDate.setValue(new Date('04/05/2031')));

    // errors should not be shown when only one field is filled
    expect(result.current.formErrors).toStrictEqual({});

    act(() => result.current.formFields.toDate.setValue(new Date('03/04/2030')));

    expect(result.current.formErrors).toStrictEqual({
      fromDate: [
        {
          type: 'invalid',
          message: '"Date From" should be equal or less than "Date To"',
        },
      ],
      toDate: [
        {
          type: 'invalid',
          message: '"Date To" should be equal or greater than "Date From"',
        },
      ],
    });

    act(() => result.current.formFields.toDate.setValue(new Date('04/05/2031')));

    expect(result.current.formErrors).toStrictEqual({});
  });

  it('should validate date range with min/max date limits', () => {
    type DateRangeForm = CustomDateRangeForm<'fromDate', 'toDate'>;

    const MIN_DATE = new Date('04/05/2031');
    const MAX_DATE = new Date('04/05/2032');

    const { result } = renderHook(() =>
      useHoneyForm<DateRangeForm>({
        fields: {
          fromDate: {
            type: 'object',
            validator: createHoneyFormDateFromValidator({
              dateToKey: 'toDate',
              minDate: MIN_DATE,
            }),
          },
          toDate: {
            type: 'object',
            validator: createHoneyFormDateToValidator({
              dateFromKey: 'fromDate',
              maxDate: MAX_DATE,
            }),
          },
        },
      }),
    );

    // Set valid from date
    act(() => result.current.formFields.fromDate.setValue(MIN_DATE));

    expect(result.current.formErrors).toStrictEqual({});

    // Set valid to date
    act(() => result.current.formFields.toDate.setValue(new Date('06/01/2031')));

    expect(result.current.formErrors).toStrictEqual({});

    // Set invalid from date (< min date)
    act(() => result.current.formFields.fromDate.setValue(new Date('04/04/2031')));

    expect(result.current.formErrors).toStrictEqual({
      fromDate: [
        {
          type: 'invalid',
          message: '"Date From" should be equal or less than "Date To"',
        },
      ],
    });

    // Set valid from date
    act(() => result.current.formFields.fromDate.setValue(new Date('05/01/2031')));

    expect(result.current.formErrors).toStrictEqual({});

    // Set invalid to date (> max date)
    act(() => result.current.formFields.toDate.setValue(new Date('04/06/2032')));

    expect(result.current.formErrors).toStrictEqual({
      toDate: [
        {
          type: 'invalid',
          message: '"Date To" should be equal or greater than "Date From"',
        },
      ],
    });

    // Set valid to date
    act(() => result.current.formFields.toDate.setValue(MAX_DATE));

    expect(result.current.formErrors).toStrictEqual({});
  });
});
