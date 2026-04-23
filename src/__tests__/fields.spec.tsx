import React, { useEffect } from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent } from 'react';

import { useHoneyForm } from '../hooks';

describe('Fields', () => {
  it('should set a new value via the `onChange` function', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    act(() =>
      result.current.formFields.name.props.onChange({
        target: { value: 'Peter' },
      } as ChangeEvent<HTMLInputElement>),
    );

    expect(result.current.formFields.name.displayValue).toBe('Peter');
  });

  it('should use custom boolean field validator', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'string',
            validator: value => value === 45,
          },
        },
      }),
    );

    expect(result.current.formFields.age.errors).toStrictEqual([]);

    act(() => result.current.formFields.age.setValue(43));

    expect(result.current.formFields.age.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid value',
      },
    ]);

    act(() => result.current.formFields.age.setValue(45));

    expect(result.current.formFields.age.errors).toStrictEqual([]);
  });

  it('should focus the form field', () => {
    const Comp = () => {
      const { formFields } = useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
      });

      useEffect(() => {
        formFields.name.focus();
      }, []);

      return <input data-testid="name" {...formFields.name.props} />;
    };

    const { getByTestId } = render(<Comp />);

    expect(document.activeElement).toBe(getByTestId('name'));
  });

  it('should call `onChange` when field value is changed', async () => {
    const onNameChange = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            onChange: onNameChange,
          },
        },
      }),
    );

    expect(onNameChange).not.toHaveBeenCalled();

    act(() => result.current.formFields.name.setValue('Dan'));

    await waitFor(() => expect(onNameChange).toHaveBeenCalledWith('Dan', expect.any(Object)));
  });
});
