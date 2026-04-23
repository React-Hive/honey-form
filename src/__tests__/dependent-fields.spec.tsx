import { act, renderHook } from '@testing-library/react';
import { useHoneyForm } from '../hooks';

describe('Dependent fields', () => {
  it('should reset dependent field on parent field change', () => {
    type Form = {
      city: string;
      address: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          city: {
            type: 'string',
          },
          address: {
            type: 'string',
            dependsOn: 'city',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.city.setValue('New York');
      result.current.formFields.address.setValue('71st Queens');
    });

    expect(result.current.formFields.city.displayValue).toBe('New York');
    expect(result.current.formFields.address.displayValue).toBe('71st Queens');

    act(() => result.current.formFields.city.setValue('New Jersey'));

    expect(result.current.formFields.city.displayValue).toBe('New Jersey');

    expect(result.current.formFields.address.displayValue).toBeUndefined();
    expect(result.current.formFields.address.rawValue).toBeUndefined();
    expect(result.current.formFields.address.normalizedValue).toBeUndefined();
    expect(result.current.formFields.address.props.value).toBe('');
  });

  it('should reset dependent field on parent update via setting form values unless `skipResetDependentFields` is true', () => {
    type Form = {
      city: string;
      address: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          city: {
            type: 'string',
          },
          address: {
            type: 'string',
            dependsOn: 'city',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.city.setValue('New York');
      result.current.formFields.address.setValue('71st Queens');
    });

    expect(result.current.formFields.city.displayValue).toBe('New York');
    expect(result.current.formFields.address.displayValue).toBe('71st Queens');

    act(() =>
      result.current.setFormValues({
        city: 'New Jersey',
      }),
    );

    expect(result.current.formFields.city.displayValue).toBe('New Jersey');

    expect(result.current.formFields.address.displayValue).toBeUndefined();
    expect(result.current.formFields.address.rawValue).toBeUndefined();
    expect(result.current.formFields.address.normalizedValue).toBeUndefined();
    expect(result.current.formFields.address.props.value).toBe('');

    act(() => result.current.formFields.address.setValue('53rd King'));

    expect(result.current.formFields.address.displayValue).toBe('53rd King');

    act(() =>
      result.current.setFormValues(
        {
          city: 'New Jersey',
        },
        {
          skipResetDependentFields: true,
        },
      ),
    );

    expect(result.current.formFields.address.displayValue).toBe('53rd King');
  });

  it('should reset the field to its default value when a dependency changes and `resetOnDependencyToDefault` is true', () => {
    type Form = {
      country: string;
      state: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          country: {
            type: 'string',
          },
          state: {
            type: 'string',
            defaultValue: 'Select a state',
            dependsOn: 'country',
            resetOnDependencyToDefault: true,
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.country.setValue('USA');
      result.current.formFields.state.setValue('New York');
    });

    expect(result.current.formFields.country.displayValue).toBe('USA');
    expect(result.current.formFields.state.displayValue).toBe('New York');

    act(() => result.current.formFields.country.setValue('Canada'));

    expect(result.current.formFields.country.displayValue).toBe('Canada');

    expect(result.current.formFields.state.displayValue).toBe('Select a state');
    expect(result.current.formFields.state.rawValue).toBe('Select a state');
    expect(result.current.formFields.state.normalizedValue).toBe('Select a state');
    expect(result.current.formFields.state.props.value).toBe('Select a state');
  });

  it('should not clear field value to `undefined` when `dependsOn` condition is met', () => {
    type Form = {
      building: string;
      unit: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          building: {
            type: 'string',
          },
          unit: {
            type: 'string',
            defaultValue: '10A',
            dependsOn: (initiatorFieldName, _, { formFields }) =>
              !formFields.unit.defaultValue && initiatorFieldName === 'building',
          },
        },
      }),
    );

    act(() => result.current.formFields.building.setValue('101st Brooklyn Road'));

    expect(result.current.formFields.building.displayValue).toBe('101st Brooklyn Road');
    expect(result.current.formFields.unit.displayValue).toBe('10A');
  });

  it('should reset dependent fields in chain when parent field changes', () => {
    type Form = {
      city: string;
      address: string;
      apt: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          city: {
            type: 'string',
          },
          address: {
            type: 'string',
            dependsOn: 'city',
          },
          apt: {
            type: 'string',
            dependsOn: 'address',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.city.setValue('New Jersey');
      result.current.formFields.address.setValue('53st Dockland');
      result.current.formFields.apt.setValue('341a');
    });

    expect(result.current.formFields.city.displayValue).toBe('New Jersey');
    expect(result.current.formFields.address.displayValue).toBe('53st Dockland');
    expect(result.current.formFields.apt.displayValue).toBe('341a');

    act(() => result.current.formFields.city.setValue('New York'));

    expect(result.current.formFields.city.displayValue).toBe('New York');

    expect(result.current.formFields.address.displayValue).toBeUndefined();
    expect(result.current.formFields.address.rawValue).toBeUndefined();
    expect(result.current.formFields.address.normalizedValue).toBeUndefined();
    expect(result.current.formFields.address.props.value).toBe('');

    expect(result.current.formFields.apt.displayValue).toBeUndefined();
    expect(result.current.formFields.apt.rawValue).toBeUndefined();
    expect(result.current.formFields.apt.normalizedValue).toBeUndefined();
    expect(result.current.formFields.apt.props.value).toBe('');
  });

  it('should submit with reset dependent field value when parent field changes', async () => {
    type Form = {
      city: string;
      address: string;
    };

    const onSubmit = vitest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          city: {
            type: 'string',
          },
          address: {
            type: 'string',
            dependsOn: 'city',
          },
        },
        onSubmit,
      }),
    );

    act(() => {
      result.current.formFields.city.setValue('New York');
      result.current.formFields.address.setValue('71st Queens');
    });

    act(() => result.current.formFields.city.setValue('New Jersey'));

    await act(() => result.current.submitForm());

    expect(onSubmit).toHaveBeenCalledWith(
      { city: 'New Jersey', address: undefined },
      expect.any(Object),
    );
  });

  it('should reset cross-dependent fields when one is modified', () => {
    type Form = {
      address1: string;
      address2: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          address1: {
            type: 'string',
            dependsOn: 'address2',
          },
          address2: {
            type: 'string',
            dependsOn: 'address1',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.address1.setValue('541st Arnold');
      result.current.formFields.address2.setValue('71st Queens');
    });

    expect(result.current.formFields.address1.displayValue).toBeUndefined();
    expect(result.current.formFields.address1.props.value).toBe('');

    expect(result.current.formFields.address2.displayValue).toBe('71st Queens');

    act(() => result.current.formFields.address1.setValue('132st Rich-Port'));

    expect(result.current.formFields.address1.displayValue).toBe('132st Rich-Port');

    expect(result.current.formFields.address2.displayValue).toBeUndefined();
    expect(result.current.formFields.address2.props.value).toBe('');
  });

  it('should clear multiple cross-dependent fields when relevant fields are modified', () => {
    type Form = {
      name: string;
      category: string;
      customCategory: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
          category: {
            type: 'string',
            dependsOn: ['name', 'customCategory'],
          },
          customCategory: {
            type: 'string',
            dependsOn: 'category',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('apple');
      result.current.formFields.category.setValue('fruits');
    });

    expect(result.current.formFields.name.displayValue).toBe('apple');
    expect(result.current.formFields.category.displayValue).toBe('fruits');

    act(() => result.current.formFields.customCategory.setValue('my-fruits'));

    expect(result.current.formFields.name.displayValue).toBe('apple');
    expect(result.current.formFields.category.displayValue).toBeUndefined();
    expect(result.current.formFields.customCategory.displayValue).toBe('my-fruits');
  });
});
