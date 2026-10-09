import { renderHook, waitFor } from '@testing-library/react';

import { defer } from '../tests.helpers';
import { useHoneyForm } from '../hooks';
import type { Nullable } from '../types';

describe('Form defaults', () => {
  type Form = {
    name: string;
    age: number;
  };

  it('should set default form fields values using fields config', () => {
    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
            defaultValue: 'Alex',
          },
          age: {
            type: 'string',
            defaultValue: 45,
          },
        },
      }),
    );

    expect(result.current.formFields.name.displayValue).toBe('Alex');
    expect(result.current.formFields.age.displayValue).toBe(45);

    expect(result.current.formValues).toStrictEqual({
      name: 'Alex',
      age: 45,
    });
  });

  it('should set default fields values using form config', () => {
    type Form = {
      name: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
        },
        defaults: {
          name: 'banana',
        },
      }),
    );

    expect(result.current.formDefaultValues.name).toBe('banana');

    expect(result.current.formFields.name.displayValue).toBe('banana');
    expect(result.current.formFields.name.normalizedValue).toBe('banana');
    expect(result.current.formFields.name.props.value).toBe('banana');
  });

  it('should set default field values via `Promise` function', async () => {
    type Form = {
      name: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
        },
        defaults: () =>
          defer(() => ({
            name: 'apple',
          })),
      }),
    );

    expect(result.current.formDefaultValues.name).toBeUndefined();

    expect(result.current.formFields.name.displayValue).toBeUndefined();
    expect(result.current.formFields.name.normalizedValue).toBeUndefined();
    expect(result.current.formFields.name.props.value).toBe('');

    await waitFor(() => expect(result.current.isFormDefaultsFetching).toBeTruthy());
    await waitFor(() => expect(result.current.isFormDefaultsFetching).toBeFalsy());

    expect(result.current.isFormDefaultsFetchingErred).toBeFalsy();

    expect(result.current.formFields.name.displayValue).toBe('apple');
    // Clean value should be undefined because the validation should not be run for defaults
    expect(result.current.formFields.name.normalizedValue).toBeUndefined();
    expect(result.current.formFields.name.props.value).toBe('apple');

    expect(result.current.formDefaultValues.name).toBe('apple');
  });

  it('should flag failed `Promise` defaults and log an error with the form name', async () => {
    type Form = {
      name: string;
    };

    const consoleErrorSpy = vitest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        name: 'profile',
        fields: {
          name: {
            type: 'string',
          },
        },
        defaults: () => Promise.reject(new Error('Network error')),
      }),
    );

    await waitFor(() => expect(result.current.isFormDefaultsFetchingErred).toBeTruthy());
    await waitFor(() => expect(result.current.isFormDefaultsFetching).toBeFalsy());

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[@react-hive/honey-form] Form "profile": Unable to fetch or process the form default values',
    );

    consoleErrorSpy.mockRestore();
  });

  it('should abort fetching defaults when component unmounts', async () => {
    type Form = {
      name: string;
    };

    const abortHandler = vitest.fn();
    let capturedSignal: Nullable<AbortSignal> = null;

    const { result, unmount } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
        },
        defaults: ({ signal }) => {
          capturedSignal = signal;

          signal.addEventListener('abort', abortHandler);

          return defer(
            () => ({
              name: 'apple',
            }),
            3000,
          );
        },
      }),
    );

    await waitFor(() => expect(result.current.isFormDefaultsFetching).toBeTruthy());

    unmount();

    expect(abortHandler).toHaveBeenCalled();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
