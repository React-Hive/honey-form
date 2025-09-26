import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

describe('Scheduled field validation', () => {
  it('should schedule validation for a field inside validator', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ amountFrom: number; amountTo: number }>({
        fields: {
          amountFrom: {
            type: 'string',
            validator: (value, { formFields, scheduleValidation }) => {
              scheduleValidation('amountTo');

              if (value > formFields.amountTo.value) {
                return 'The `amountFrom` field value must be less than `amountTo`';
              }

              return true;
            },
          },
          amountTo: {
            type: 'string',
            validator: (value, { formFields, scheduleValidation }) => {
              scheduleValidation('amountFrom');

              if (value < formFields.amountFrom.value) {
                return 'The `amountTo` field value must be greater than `amountFrom`';
              }

              return true;
            },
          },
        },
      }),
    );

    act(() => result.current.formFields.amountFrom.setValue(5));

    // errors should not be shown when only one field is filled
    expect(result.current.formErrors).toStrictEqual({});

    act(() => result.current.formFields.amountTo.setValue(3));

    expect(result.current.formErrors).toStrictEqual({
      amountFrom: [
        {
          type: 'invalid',
          message: 'The `amountFrom` field value must be less than `amountTo`',
        },
      ],
      amountTo: [
        {
          type: 'invalid',
          message: 'The `amountTo` field value must be greater than `amountFrom`',
        },
      ],
    });

    act(() => result.current.formFields.amountFrom.setValue(2));

    expect(result.current.formErrors).toStrictEqual({});
  });
});
