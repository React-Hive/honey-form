import { act, renderHook } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

describe('Dynamic fields', () => {
  it('should dynamically add a new form field', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ gender?: 'male' | 'female' }>({
        fields: {},
      }),
    );

    act(() => {
      result.current.addFormField('gender', {
        type: 'string',
        defaultValue: 'female',
      });
    });

    expect(result.current.formFields.gender?.value).toBe('female');
  });

  it('should submit dynamically added a form field with other fields', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ age: number; gender?: 'male' | 'female' }>({
        fields: {
          age: {
            type: 'string',
            defaultValue: 30,
          },
        },
        onSubmit,
      }),
    );

    act(() => {
      result.current.addFormField('gender', {
        type: 'string',
        defaultValue: 'female',
      });
    });

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalledWith({ age: 30, gender: 'female' }, { context: undefined });
  });

  it('should remove dynamically added the form field', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age?: number }>({
        fields: {
          age: {
            type: 'string',
            defaultValue: 10,
          },
        },
      }),
    );
    expect(result.current.formFields.age?.value).toBe(10);

    act(() => result.current.removeFormField('age'));

    expect(result.current.formFields.age?.value).toBeUndefined();
  });
});
