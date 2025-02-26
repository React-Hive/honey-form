import React, { useEffect } from 'react';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';

import type { ChangeEvent } from 'react';
import { useHoneyForm } from '../hooks';

describe('Hook [use-honey-form]: General', () => {
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
    const onChange = jest.fn();

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

    expect(result.current.formFields.name.value).toBe('banana');
    expect(result.current.formFields.name.cleanValue).toBe('banana');
    expect(result.current.formFields.name.props.value).toBe('banana');

    expect(result.current.formFields.kind.value).toBe('fruit');
    expect(result.current.formFields.kind.cleanValue).toBe('fruit');
    expect(result.current.formFields.kind.props.value).toBe('fruit');

    act(() => result.current.setFormValues({ name: 'apple' }));

    expect(result.current.formFields.name.value).toBe('apple');
    expect(result.current.formFields.name.cleanValue).toBe('apple');
    expect(result.current.formFields.name.props.value).toBe('apple');

    expect(result.current.formFields.kind.value).toBe('fruit');
    expect(result.current.formFields.kind.cleanValue).toBe('fruit');
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

    expect(result.current.formFields.kind.value).toBe('vegetable');

    act(() => result.current.setFormValues({ name: 'orange' }, { isClearAll: true }));

    expect(result.current.formFields.name.value).toBe('orange');

    expect(result.current.formFields.kind.value).toBe('fruit');
    expect(result.current.formFields.kind.rawValue).toBe('fruit');
    expect(result.current.formFields.kind.cleanValue).toBe('fruit');
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

    expect(result.current.formFields.name.value).toBe('apple');
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

    expect(result.current.formFields.name.value).toBe('banana');

    externalFormValues = { name: 'apple' };
    rerender();

    expect(result.current.formFields.name.value).toBe('apple');
  });
});

describe('Hook [use-honey-form]: Form context', () => {
  it('should use `allowedNames` configuration from the context in validator function', () => {
    type FormData = {
      name: string;
    };

    type FormContext = {
      allowedNames: string[];
    };

    const { result } = renderHook(() =>
      useHoneyForm<FormData, FormContext>({
        fields: {
          name: {
            type: 'string',
            validator: (value, { formContext }) => formContext.allowedNames.includes(value),
          },
        },
        context: {
          allowedNames: ['Apple'],
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Apple');
    });

    expect(result.current.formFields.name.value).toBe('Apple');
    expect(result.current.formErrors).toStrictEqual({});
  });

  it('should use `maxStrLength` configuration from the context in filter function', () => {
    type FormData = {
      name: string;
    };

    type FormContext = {
      maxStrLength: number;
    };

    const { result } = renderHook(() =>
      useHoneyForm<FormData, FormContext>({
        fields: {
          name: {
            type: 'string',
            filter: (value, { formContext }) => value?.slice(0, formContext.maxStrLength),
          },
        },
        context: {
          maxStrLength: 5,
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Apple123');
    });

    expect(result.current.formFields.name.value).toBe('Apple');
    expect(result.current.formErrors).toStrictEqual({});
  });

  it('should use `currencySign` configuration from the context in format function', () => {
    type FormData = {
      price: string;
    };

    type FormContext = {
      currencySign: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<FormData, FormContext>({
        fields: {
          price: {
            type: 'string',
            formatter: (value, { formContext }) => `${formContext.currencySign}${value}`,
          },
        },
        context: {
          currencySign: '$',
        },
      }),
    );

    act(() => {
      result.current.formFields.price.setValue('15');
    });

    expect(result.current.formFields.price.value).toBe('$15');
    expect(result.current.formErrors).toStrictEqual({});
  });
});

describe('Hook [use-honey-form]: Reset form', () => {
  it('should reset to initial field values', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; age: string }>({
        fields: {
          name: {
            type: 'string',
            defaultValue: 'Alex',
          },
          age: {
            type: 'string',
            defaultValue: '45',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Dima');
      result.current.formFields.age.setValue('47');
    });

    expect(result.current.formValues).toStrictEqual({
      name: 'Dima',
      age: '47',
    });

    act(() => result.current.resetForm());

    expect(result.current.formValues).toStrictEqual({
      name: 'Alex',
      age: '45',
    });
  });

  it('should clear form and field errors after form reset', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
            required: true,
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Apple');
    });

    expect(result.current.formValues.name).toBe('Apple');

    act(() => result.current.resetForm());

    expect(result.current.formValues.name).toBe(undefined);

    expect(result.current.formErrors).toStrictEqual({});
    expect(result.current.formFields.name.errors).toStrictEqual([]);
  });

  it('should set new default values when resetting the form', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; price: string }>({
        fields: {
          name: {
            type: 'string',
          },
          price: {
            type: 'string',
          },
        },
        defaults: {
          name: 'Product',
          price: '10',
        },
      }),
    );

    act(() => {
      result.current.formFields.name.setValue('Lemon');
      result.current.formFields.price.setValue('7');
    });

    act(() =>
      result.current.resetForm({
        name: 'Pear',
        price: '5',
      }),
    );

    expect(result.current.formDefaultValues).toStrictEqual({
      name: 'Pear',
      price: '5',
    });

    expect(result.current.formValues).toStrictEqual({
      name: 'Pear',
      price: '5',
    });
  });
});

describe('Hook [use-honey-form]: Default values', () => {
  it('should set default form fields values using fields config', () => {
    const { result } = renderHook(() =>
      useHoneyForm({
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

    expect(result.current.formFields.name.value).toBe('Alex');
    expect(result.current.formFields.age.value).toBe(45);

    expect(result.current.formValues).toStrictEqual({
      name: 'Alex',
      age: 45,
    });
  });

  it('should set default fields values using form config', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
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

    expect(result.current.formFields.name.value).toBe('banana');
    expect(result.current.formFields.name.cleanValue).toBe('banana');
    expect(result.current.formFields.name.props.value).toBe('banana');
  });

  it('should set default field values via `Promise` function', async () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
        defaults: () =>
          new Promise(resolve => {
            setTimeout(() => {
              resolve({
                name: 'apple',
              });
            });
          }),
      }),
    );

    expect(result.current.formDefaultValues.name).toBeUndefined();

    expect(result.current.formFields.name.value).toBeUndefined();
    expect(result.current.formFields.name.cleanValue).toBeUndefined();
    expect(result.current.formFields.name.props.value).toBe('');

    await waitFor(() => expect(result.current.isFormDefaultsFetching).toBeTruthy());
    await waitFor(() => expect(result.current.isFormDefaultsFetching).toBeFalsy());

    expect(result.current.formFields.name.value).toBe('apple');
    // Clean value should be undefined because the validation should not be run for defaults
    expect(result.current.formFields.name.cleanValue).toBeUndefined();
    expect(result.current.formFields.name.props.value).toBe('apple');

    expect(result.current.formDefaultValues.name).toBe('apple');
  });
});

describe('Hook [use-honey-form]: Fields', () => {
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

    act(() => {
      result.current.formFields.name.props.onChange({
        target: { value: 'Peter' },
      } as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formFields.name.value).toBe('Peter');
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

    act(() => {
      result.current.formFields.age.setValue(43);
    });

    expect(result.current.formFields.age.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid value',
      },
    ]);

    act(() => {
      result.current.formFields.age.setValue(45);
    });

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
    const onNameChange = jest.fn();

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

    act(() => {
      result.current.formFields.name.setValue('Dan');
    });

    await waitFor(() => expect(onNameChange).toHaveBeenCalledWith('Dan', expect.any(Object)));
  });
});

describe('Hook [use-honey-form]: String field type', () => {
  it('should only fill interactive field props for string field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    expect(result.current.formFields.name.props).toBeDefined();
    expect(result.current.formFields.name.passiveProps).toBeUndefined();
    expect(result.current.formFields.name.objectProps).toBeUndefined();
  });
});

describe('Hook [use-honey-form]: Numeric field type', () => {
  it('should only fill interactive field props for numeric field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ phone: string }>({
        fields: {
          phone: {
            type: 'numeric',
          },
        },
      }),
    );

    expect(result.current.formFields.phone.props).toBeDefined();
    expect(result.current.formFields.phone.passiveProps).toBeUndefined();
    expect(result.current.formFields.phone.objectProps).toBeUndefined();
  });

  it('should not raise an error when numeric value is empty', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ phone: string }>({
        fields: {
          phone: {
            type: 'numeric',
          },
        },
      }),
    );
    expect(result.current.formFields.phone.errors).toStrictEqual([]);

    act(() => {
      result.current.formFields.phone.setValue('');
    });

    expect(result.current.formFields.phone.errors).toStrictEqual([]);
  });

  it('should not raise an error when numeric value is correct', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ phone: string }>({
        fields: {
          phone: {
            type: 'numeric',
          },
        },
      }),
    );
    expect(result.current.formFields.phone.errors).toStrictEqual([]);

    act(() => {
      result.current.formFields.phone.setValue('12345678901234567890');
    });

    expect(result.current.formFields.phone.errors).toStrictEqual([]);
  });

  it('should raise an error when numeric value contains non-numeric characters', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ phone: string }>({
        fields: {
          phone: {
            type: 'numeric',
          },
        },
      }),
    );
    expect(result.current.formFields.phone.errors).toStrictEqual([]);

    act(() => {
      result.current.formFields.phone.setValue('1a2');
    });

    expect(result.current.formFields.phone.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid format',
      },
    ]);
  });
});

describe('Hook [use-honey-form]: Number field type', () => {
  it('should only fill interactive field props for number field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: string }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    expect(result.current.formFields.age.props).toBeDefined();
    expect(result.current.formFields.age.passiveProps).toBeUndefined();
    expect(result.current.formFields.age.objectProps).toBeUndefined();
  });

  it('initially the number field type value should be undefined', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    expect(result.current.formFields.age.value).toBeUndefined();
    expect(result.current.formFields.age.cleanValue).toBeUndefined();
  });

  it('string value should be converted to number using number type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.age.props.onChange({
        target: { value: '35' },
      } as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formFields.age.value).toBe('35');
    expect(result.current.formFields.age.cleanValue).toBe(35);
  });

  it('empty string value should be converted to `undefined` using number type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.age.props.onChange({
        target: { value: '' },
      } as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.formFields.age.value).toBe('');
    expect(result.current.formFields.age.cleanValue).toBeUndefined();
  });

  it('negative value should be allowed by default for number field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ age: number }>({
        fields: {
          age: {
            type: 'number',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.age.setValue(-5);
    });

    expect(result.current.formFields.age.value).toBe(-5);
    expect(result.current.formFields.age.cleanValue).toBe(-5);
    expect(result.current.formFields.age.errors).toStrictEqual([]);
  });
});

describe('Hook [use-honey-form]: Email field type', () => {
  it('should only fill interactive field props for email field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ email: string }>({
        fields: {
          email: {
            type: 'email',
          },
        },
      }),
    );

    expect(result.current.formFields.email.props).toBeDefined();
    expect(result.current.formFields.email.passiveProps).toBeUndefined();
    expect(result.current.formFields.email.objectProps).toBeUndefined();
  });

  it('should not raise an error when email is empty', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ email: string }>({
        fields: {
          email: {
            type: 'email',
          },
        },
      }),
    );

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue(''));

    expect(result.current.formFields.email.errors).toStrictEqual([]);
  });

  it('should raise an error when email is not valid', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ email: string }>({
        fields: {
          email: {
            type: 'email',
          },
        },
      }),
    );
    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('abc'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);

    act(() => result.current.formFields.email.setValue('a@'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);

    act(() => result.current.formFields.email.setValue('a@g'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);

    act(() => result.current.formFields.email.setValue('a@gmail.'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);

    act(() => result.current.formFields.email.setValue('...a@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([
      {
        type: 'invalid',
        message: 'Invalid email format',
      },
    ]);
  });

  it('should pass email validation when email is correct', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ email: string }>({
        fields: {
          email: {
            type: 'email',
          },
        },
      }),
    );
    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('a.kr@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('a+1@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('a-b@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([]);

    act(() => result.current.formFields.email.setValue('a_b@gmail.com'));

    expect(result.current.formFields.email.errors).toStrictEqual([]);
  });
});

describe('Hook [use-honey-form]: Checkbox field type', () => {
  it('should only fill passive field props for checkbox field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ isAcceptTerms: boolean }>({
        fields: {
          isAcceptTerms: {
            type: 'checkbox',
          },
        },
      }),
    );

    expect(result.current.formFields.isAcceptTerms.props).toBeUndefined();
    expect(result.current.formFields.isAcceptTerms.passiveProps).toBeDefined();
    expect(result.current.formFields.isAcceptTerms.objectProps).toBeUndefined();
  });

  it('should have `checked` attribute in `passiveProps` for checkbox field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ isAcceptTerms: boolean }>({
        fields: {
          isAcceptTerms: {
            type: 'checkbox',
          },
        },
      }),
    );

    expect(result.current.formFields.isAcceptTerms.passiveProps.checked).toBeDefined();
  });
});

describe('Hook [use-honey-form]: Radio field type', () => {
  it('should only fill passive field props for radio field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ mode: string }>({
        fields: {
          mode: {
            type: 'radio',
          },
        },
      }),
    );

    expect(result.current.formFields.mode.props).toBeUndefined();
    expect(result.current.formFields.mode.passiveProps).toBeDefined();
    expect(result.current.formFields.mode.objectProps).toBeUndefined();
  });

  it('should not have `checked` attribute in `passiveProps` for radio field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ mode: string }>({
        fields: {
          mode: {
            type: 'radio',
          },
        },
      }),
    );

    expect('checked' in result.current.formFields.mode.passiveProps).toBeFalsy();
  });
});

describe('Hook [use-honey-form]: Object field type', () => {
  type Category = {
    id: number;
    name: string;
  };

  it('should only fill object field props for object field type', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ category: Category }>({
        fields: {
          category: {
            type: 'object',
          },
        },
      }),
    );

    expect(result.current.formFields.category.props).toBeUndefined();
    expect(result.current.formFields.category.passiveProps).toBeUndefined();
    expect(result.current.formFields.category.objectProps).toBeDefined();
  });

  it('should set a new value via the `onChange` function using `objectProps`', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ category: Category }>({
        fields: {
          category: {
            type: 'object',
          },
        },
      }),
    );

    act(() => {
      result.current.formFields.category.objectProps.onChange({
        id: 0,
        name: 'Fruits',
      });
    });

    expect(result.current.formFields.category.value).toStrictEqual({
      id: 0,
      name: 'Fruits',
    });
  });
});

describe('Hook [use-honey-form]: Skipping fields', () => {
  it('should skip field permanently', async () => {
    type Form = {
      name: string;
      price: number;
    };

    const onSubmit = jest.fn<Promise<void>, [Form]>();

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

    expect(result.current.formFields.name.value).toBe('Apple');
    expect(result.current.formFields.price.value).toBe(10);

    await act(() => result.current.submitForm());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Apple',
        },
        { context: undefined },
      ),
    );
  });

  it('should skip field by condition', async () => {
    type Form = {
      name: string;
      price: number;
    };

    const onSubmit = jest.fn<Promise<void>, [Form]>();

    const { result } = renderHook(() =>
      useHoneyForm<Form>({
        fields: {
          name: {
            type: 'string',
          },
          price: {
            type: 'number',
            skip: ({ formFields }) => formFields.name.value === 'Pear',
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
        { context: undefined },
      ),
    );

    act(() => {
      result.current.formFields.name.setValue('Pear');
    });

    await act(() => result.current.submitForm());

    expect(result.current.formFields.price.value).toBe(15);

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Pear',
        },
        { context: undefined },
      ),
    );
  });
});

describe('Hook [use-honey-form]: Dependent fields', () => {
  it('should reset dependent field on parent field change', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ city: string; address: string }>({
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

    expect(result.current.formFields.city.value).toBe('New York');
    expect(result.current.formFields.address.value).toBe('71st Queens');

    act(() => result.current.formFields.city.setValue('New Jersey'));

    expect(result.current.formFields.city.value).toBe('New Jersey');

    expect(result.current.formFields.address.value).toBeUndefined();
    expect(result.current.formFields.address.rawValue).toBeUndefined();
    expect(result.current.formFields.address.cleanValue).toBeUndefined();
    expect(result.current.formFields.address.props.value).toBe('');
  });

  it('should not reset unit value to undefined when dependsOn condition is met', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ building: string; unit: string }>({
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

    expect(result.current.formFields.building.value).toBe('101st Brooklyn Road');
    expect(result.current.formFields.unit.value).toBe('10A');
  });

  it('should reset dependent fields in chain when parent field changes', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ city: string; address: string; apt: string }>({
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

    expect(result.current.formFields.city.value).toBe('New Jersey');
    expect(result.current.formFields.address.value).toBe('53st Dockland');
    expect(result.current.formFields.apt.value).toBe('341a');

    act(() => result.current.formFields.city.setValue('New York'));

    expect(result.current.formFields.city.value).toBe('New York');

    expect(result.current.formFields.address.value).toBeUndefined();
    expect(result.current.formFields.address.rawValue).toBeUndefined();
    expect(result.current.formFields.address.cleanValue).toBeUndefined();
    expect(result.current.formFields.address.props.value).toBe('');

    expect(result.current.formFields.apt.value).toBeUndefined();
    expect(result.current.formFields.apt.rawValue).toBeUndefined();
    expect(result.current.formFields.apt.cleanValue).toBeUndefined();
    expect(result.current.formFields.apt.props.value).toBe('');
  });

  it('should submit with reset dependent field value when parent field changes', async () => {
    const onSubmit = jest.fn();

    const { result } = renderHook(() =>
      useHoneyForm<{ city: string; address: string }>({
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
      { context: undefined },
    );
  });

  it('should reset cross-dependent fields when one is modified', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ address1: string; address2: string }>({
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

    expect(result.current.formFields.address1.value).toBeUndefined();
    expect(result.current.formFields.address1.props.value).toBe('');

    expect(result.current.formFields.address2.value).toBe('71st Queens');

    act(() => result.current.formFields.address1.setValue('132st Rich-Port'));

    expect(result.current.formFields.address1.value).toBe('132st Rich-Port');

    expect(result.current.formFields.address2.value).toBeUndefined();
    expect(result.current.formFields.address2.props.value).toBe('');
  });

  it('should clear multiple cross-dependent fields when relevant fields are modified', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string; category: string; customCategory: string }>({
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

    expect(result.current.formFields.name.value).toBe('apple');
    expect(result.current.formFields.category.value).toBe('fruits');

    act(() => result.current.formFields.customCategory.setValue('my-fruits'));

    expect(result.current.formFields.name.value).toBe('apple');
    expect(result.current.formFields.category.value).toBeUndefined();
    expect(result.current.formFields.customCategory.value).toBe('my-fruits');
  });
});

describe('Hook [use-honey-form]: Work with dynamic fields', () => {
  it('dynamically add a new form field', () => {
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

  it('dynamically added the new form field should be submitted with other fields', async () => {
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

  it('remove dynamically added the form field', () => {
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
