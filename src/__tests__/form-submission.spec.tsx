import type { ChangeEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useHoneyForm } from '../hooks';

describe('Form submission', () => {
  it('should submit default fields values', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; age: number }>({
        fields: {
          name: {
            type: 'string',
            defaultValue: 'Peter',
          },
          age: {
            type: 'string',
            defaultValue: 23,
          },
        },
        onSubmit,
      }),
    );

    expect(onSubmit).not.toHaveBeenCalled();

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Peter', age: 23 }, expect.any(Object));
  });

  it('should update form states after successful submission', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
        },
        onSubmit,
      }),
    );

    act(() => result.current.formFields.name.setValue('Apple'));

    expect(result.current.isFormDirty).toBeTruthy();
    expect(result.current.isFormValid).toBeFalsy();
    expect(result.current.isFormSubmitted).toBeFalsy();
    expect(result.current.isFormSubmitAllowed).toBeTruthy();

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalled();

    expect(result.current.isFormDirty).toBeFalsy();
    expect(result.current.isFormValid).toBeTruthy();
    expect(result.current.isFormSubmitted).toBeTruthy();
    expect(result.current.isFormSubmitAllowed).toBeTruthy();
  });

  it('should not update form states after unsuccessful submission', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
        },
        onSubmit,
      }),
    );

    act(() => result.current.formFields.name.setValue(''));

    expect(result.current.isFormDirty).toBeTruthy();
    expect(result.current.isFormValid).toBeFalsy();
    expect(result.current.isFormSubmitted).toBeFalsy();

    await act(() => result.current.submitForm());

    expect(onSubmit).not.toHaveBeenCalled();

    expect(result.current.isFormDirty).toBeTruthy();
    expect(result.current.isFormValid).toBeFalsy();
    expect(result.current.isFormSubmitted).toBeFalsy();
  });

  it('should call custom submit form handler function', async () => {
    const submitHandler = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; age: number }>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
          age: {
            type: 'string',
          },
        },
      }),
    );

    expect(submitHandler).not.toHaveBeenCalled();

    act(() => result.current.formFields.name.setValue('Ken'));

    await act(() => result.current.submitForm(submitHandler));

    expect(submitHandler).toHaveBeenCalledWith({ name: 'Ken', age: undefined }, expect.any(Object));
  });

  it('should prevent form submission with errors', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
            min: 3,
            max: 5,
          },
        },
        onSubmit,
      }),
    );

    act(() => {
      result.current.formFields.age.props.onChange({
        target: { value: '1' },
      } as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formFields.age.errors.length).toBe(1);
    expect(result.current.isFormSubmitAllowed).toBeTruthy();

    await act(() => result.current.submitForm());

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should reset a form after successful submission when `resetAfterSubmit` is `true`', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: true,
            defaultValue: 'Banana',
          },
        },
        resetAfterSubmit: true,
        onSubmit,
      }),
    );

    act(() => result.current.formFields.name.setValue('Apple'));

    expect(result.current.formValues.name).toBe('Apple');

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalled();
    expect(result.current.formValues.name).toBe('Banana');

    expect(result.current.formErrors).toStrictEqual({});
    expect(result.current.formFields.name.errors).toStrictEqual([]);
  });
});
