import React from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

describe('General tests', () => {
  it('should be dirty after setting a new field value', () => {
    const { result } = renderHook(() =>
      useHoneyForm({
        fields: {
          age: {
            type: 'string',
            defaultValue: 45,
          },
        },
      }),
    );

    expect(result.current.isFormDirty).toBeFalsy();

    act(() => result.current.formFields.age.setValue(56));

    expect(result.current.isFormDirty).toBeTruthy();
  });

  it('should not mark the form as dirty when successfully submitted', async () => {
    const { result } = renderHook(() =>
      useHoneyForm({
        fields: {
          age: {
            type: 'string',
            defaultValue: 45,
          },
        },
        onSubmit: async () => {},
      }),
    );

    act(() => result.current.formFields.age.setValue(56));

    expect(result.current.isFormDirty).toBeTruthy();

    await act(() => result.current.submitForm());

    expect(result.current.isFormDirty).toBeFalsy();
  });

  it('should clear manually added form fields errors', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; age: number }>({
        fields: {
          name: {
            type: 'string',
          },
          age: {
            type: 'string',
          },
        },
      }),
    );

    act(() => {
      result.current.addFormFieldError('name', {
        type: 'server',
        message: 'name should be less than 255 chars',
      });

      result.current.addFormFieldError('age', {
        type: 'server',
        message: 'age should be less than 55',
      });
    });

    expect(Object.keys(result.current.formErrors).length).toBe(2);

    act(() => result.current.clearFormErrors());

    expect(Object.keys(result.current.formErrors).length).toBe(0);
  });

  it('should re-render form one time when `onChange` is triggered', () => {
    let renderers = 0;

    const Comp = () => {
      const { formFields } = useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
      });

      renderers += 1;

      return <input {...formFields.name.props} data-testid="name" />;
    };

    const { getByTestId } = render(<Comp />);

    expect(renderers).toBe(1);

    fireEvent.change(getByTestId('name'), { target: { value: 'Jake' } });

    expect(renderers).toBe(2);
  });

  it('should call `onChange` with form data when any field value is changed', async () => {
    const onChange = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; kind: string }>({
        fields: {
          name: {
            type: 'string',
          },
          kind: {
            type: 'string',
          },
        },
        onChange,
      }),
    );

    expect(onChange).not.toHaveBeenCalled();

    act(() => result.current.formFields.name.setValue('a'));

    await waitFor(() =>
      expect(onChange.mock.calls[0][0]).toStrictEqual({ name: 'a', kind: undefined }),
    );

    act(() => result.current.formFields.kind.setValue('f'));

    await waitFor(() => expect(onChange.mock.calls[1][0]).toStrictEqual({ name: 'a', kind: 'f' }));
  });

  it('should indicate form is dirty after setting new values', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
        defaults: {
          name: 'Apple',
        },
      }),
    );

    expect(result.current.isFormDirty).toBeFalsy();

    act(() => result.current.setFormValues({ name: 'apple' }));

    expect(result.current.isFormDirty).toBeTruthy();
  });

  it('should partially set form values', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; kind: string }>({
        fields: {
          name: {
            type: 'string',
            defaultValue: 'banana',
          },
          kind: {
            type: 'string',
            defaultValue: 'fruit',
          },
        },
      }),
    );

    expect(result.current.formFields.name.displayValue).toBe('banana');
    expect(result.current.formFields.name.normalizedValue).toBe('banana');
    expect(result.current.formFields.name.props.value).toBe('banana');

    expect(result.current.formFields.kind.displayValue).toBe('fruit');
    expect(result.current.formFields.kind.normalizedValue).toBe('fruit');
    expect(result.current.formFields.kind.props.value).toBe('fruit');

    act(() => result.current.setFormValues({ name: 'apple' }));

    expect(result.current.formFields.name.displayValue).toBe('apple');
    expect(result.current.formFields.name.normalizedValue).toBe('apple');
    expect(result.current.formFields.name.props.value).toBe('apple');

    expect(result.current.formFields.kind.displayValue).toBe('fruit');
    expect(result.current.formFields.kind.normalizedValue).toBe('fruit');
    expect(result.current.formFields.kind.props.value).toBe('fruit');
  });

  it('should partially set form values with resetting all values to default', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; kind: string }>({
        fields: {
          name: {
            type: 'string',
            defaultValue: 'banana',
          },
          kind: {
            type: 'string',
            defaultValue: 'fruit',
          },
        },
      }),
    );

    act(() => result.current.formFields.kind.setValue('vegetable'));

    expect(result.current.formFields.kind.displayValue).toBe('vegetable');

    act(() => result.current.setFormValues({ name: 'orange' }, { clearAll: true }));

    expect(result.current.formFields.name.displayValue).toBe('orange');

    expect(result.current.formFields.kind.displayValue).toBe('fruit');
    expect(result.current.formFields.kind.rawValue).toBe('fruit');
    expect(result.current.formFields.kind.normalizedValue).toBe('fruit');
    expect(result.current.formFields.kind.props.value).toBe('fruit');
  });

  it('should initially synchronize form values with external values', () => {
    type Form = { name: string };

    const externalFormValues: Partial<Form> = { name: 'apple' };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            defaultValue: 'banana',
          },
        },
        values: externalFormValues,
      }),
    );

    expect(result.current.formFields.name.displayValue).toBe('apple');
  });

  it('should synchronize form values with external values', () => {
    type Form = { name: string };

    let externalFormValues: Partial<Form> = {};

    const { result, rerender } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            defaultValue: 'banana',
          },
        },
        values: externalFormValues,
      }),
    );

    expect(result.current.formFields.name.displayValue).toBe('banana');

    externalFormValues = { name: 'apple' };
    rerender();

    expect(result.current.formFields.name.displayValue).toBe('apple');
  });

  it('should not synchronize form values with external values for dirty fields', () => {
    type Form = {
      nameA: string;
      nameB: string;
    };

    let externalFormValues: Form = {
      nameA: 'banana',
      nameB: 'apple',
    };

    const { result, rerender } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          nameA: {
            type: 'string',
          },
          nameB: {
            type: 'string',
          },
        },
        values: externalFormValues,
        skipSyncDirtyFields: true,
      }),
    );

    expect(result.current.formFields.nameA.displayValue).toBe('banana');

    act(() => result.current.formFields.nameA.setValue('pear'));

    externalFormValues = {
      nameA: 'raspberry',
      nameB: 'mango',
    };

    rerender();

    expect(result.current.formFields.nameA.displayValue).toBe('pear');
    expect(result.current.formFields.nameB.displayValue).toBe('mango');
  });
});
