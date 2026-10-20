import { act, renderHook, waitFor } from '@testing-library/react';

import { useHoneyForm } from '../hooks';

describe('Skip form fields', () => {
  it('should skip field permanently', async () => {
    type Form = {
      name: string;
      price: number;
    };

    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
          price: {
            type: 'string',
            skip: () => true,
          },
        },
        onSubmit,
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Apple');
      result.current.formFields.price.setValue(10);
    });

    expect(result.current.formFields.name.displayValue).toBe('Apple');
    expect(result.current.formFields.price.displayValue).toBe(10);

    await act(() => result.current.submitForm());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Apple',
        },
        expect.any(Object),
      ),
    );
  });

  it('should skip form field by condition', async () => {
    type Form = {
      name: string;
      price: number;
    };

    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
          price: {
            type: 'number',
            skip: ({ formFields }) => formFields.name.displayValue === 'Pear',
          },
        },
        onSubmit,
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Orange');
      result.current.formFields.price.setValue(15);
    });

    await act(() => result.current.submitForm());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Orange',
          price: 15,
        },
        expect.any(Object),
      ),
    );

    act(() => result.current.formFields.name.setValue('Pear'));

    await act(() => result.current.submitForm());

    expect(result.current.formFields.price.displayValue).toBe(15);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Pear',
        },
        expect.any(Object),
      ),
    );
  });

  it('should give a field its submit value back once it is no longer skipped', async () => {
    type Form = {
      isCourierOffered: boolean;
      courierPrice: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          isCourierOffered: {
            type: 'checkbox',
            defaultValue: true,
          },
          courierPrice: {
            type: 'number',
            decimal: true,
            skip: ({ formValues }) => !formValues.isCourierOffered,
          },
        },
      }),
    );

    act(() => result.current.formFields.courierPrice.setValue(24.4));

    await waitFor(() => expect(result.current.formSubmitValues.courierPrice).toBe(24.4));

    act(() => result.current.formFields.isCourierOffered.setValue(false));

    await waitFor(() => expect(result.current.formSubmitValues).not.toHaveProperty('courierPrice'));

    act(() => result.current.formFields.isCourierOffered.setValue(true));

    await waitFor(() => expect(result.current.formSubmitValues.courierPrice).toBe(24.4));
  });
});
