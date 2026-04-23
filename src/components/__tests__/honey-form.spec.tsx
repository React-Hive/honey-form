import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';

import type { HoneyFormFieldsConfig } from '../../types';

import { HoneyForm } from '../honey-form';
import { HoneyFormDynamicField } from '../honey-form-dynamic.field';

describe('Component [HoneyForm]: Basic usage', () => {
  it('should render the form component', () => {
    const fields = {};

    const { getByTestId } = render(<HoneyForm fields={fields} />);

    expect(getByTestId('honey-form')).toBeDefined();
  });

  it('the form should accept the function as content', () => {
    type Form = {
      name: string;
    };

    const fields: HoneyFormFieldsConfig<Form> = {
      name: {
        type: 'string',
      },
    };

    const { getByTestId } = render(
      <HoneyForm fields={fields}>
        {() => (
          <button type="submit" data-testid="save">
            Save
          </button>
        )}
      </HoneyForm>,
    );

    expect(getByTestId('save')).toBeDefined();
  });

  it('the form should be submitted when submit button is clicked', async () => {
    type Form = {
      name: string;
    };

    const onSubmit = vitest.fn();

    const fields: HoneyFormFieldsConfig<Form> = {
      name: {
        type: 'string',
      },
    };

    const { getByTestId } = render(
      <HoneyForm fields={fields} onSubmit={onSubmit}>
        <button type="submit" data-testid="save">
          Save
        </button>
      </HoneyForm>,
    );

    expect(onSubmit).not.toHaveBeenCalledWith();

    fireEvent.click(getByTestId('save'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});

describe('Component [HoneyForm]: Field mode usage', () => {
  it('should validate field only when `onBlur` event is triggered', async () => {
    type Form = {
      name: string;
    };

    const onSubmit = vitest.fn();

    const fields: HoneyFormFieldsConfig<Form> = {
      name: {
        type: 'string',
        mode: 'blur',
        validator: value => value.length > 3,
      },
    };

    const { getByTestId } = render(
      <HoneyForm fields={fields} onSubmit={onSubmit}>
        {({ formFields }) => (
          <>
            <input data-testid="name" {...formFields.name.props} />

            <button type="submit" data-testid="save">
              Save
            </button>
          </>
        )}
      </HoneyForm>,
    );

    fireEvent.change(getByTestId('name'), { target: { value: 'App' } });
    expect(getByTestId('name').getAttribute('aria-invalid')).toBe('false');

    fireEvent.blur(getByTestId('name'));
    expect(getByTestId('name').getAttribute('aria-invalid')).toBe('true');

    fireEvent.change(getByTestId('name'), { target: { value: 'Apple' } });
    // Submit the form
    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Apple',
        },
        expect.any(Object),
      ),
    );
  });
});

describe('Component [HoneyForm]: File field type', () => {
  it('should handle multiple files field type', async () => {
    type Form = {
      images: FileList;
    };

    const onSubmit = vitest.fn();

    const fields: HoneyFormFieldsConfig<Form> = {
      images: {
        required: true,
        type: 'file',
        props: {
          multiple: true,
        },
      },
    };

    const { getByTestId } = render(
      <HoneyForm fields={fields} onSubmit={onSubmit}>
        {({ formFields }) => (
          <>
            <input data-testid="images" {...formFields.images.passiveProps} />

            <button type="submit" data-testid="save">
              Save
            </button>
          </>
        )}
      </HoneyForm>,
    );

    const file = new Blob(['test data'], { type: 'text/plain' });

    fireEvent.change(getByTestId('images'), { target: { files: [file] } });

    // Submit the form
    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          images: [expect.any(Blob)],
        },
        expect.any(Object),
      ),
    );
  });
});

describe('Component [HoneyFormDynamicField]', () => {
  it('set and submit the field value', async () => {
    const onSubmit = vitest.fn();

    const { getByTestId } = render(
      <HoneyForm onSubmit={onSubmit}>
        <HoneyFormDynamicField type="string" name="product" defaultValue="apple">
          {field => <input {...field.props} />}
        </HoneyFormDynamicField>

        <button type="submit" data-testid="save">
          Save
        </button>
      </HoneyForm>,
    );

    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ product: 'apple' }, expect.any(Object)),
    );
  });

  it('should submit form with correct gender value for unselected and selected radio inputs', async () => {
    const onSubmit = vitest.fn();

    const { getByTestId } = render(
      <HoneyForm onSubmit={onSubmit}>
        <HoneyFormDynamicField name="gender" type="radio" defaultValue={null}>
          {field => (
            <fieldset name="gender">
              <input value="male" data-testid="male" {...field.passiveProps} />
              <input value="female" data-testid="female" {...field.passiveProps} />
              <input value="other" data-testid="other" {...field.passiveProps} />
            </fieldset>
          )}
        </HoneyFormDynamicField>

        <button type="submit" data-testid="save">
          Save
        </button>
      </HoneyForm>,
    );

    // case 1
    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          gender: null,
        },
        expect.any(Object),
      ),
    );

    // case 2
    fireEvent.click(getByTestId('female'));
    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          gender: 'female',
        },
        expect.any(Object),
      ),
    );
  });
});
