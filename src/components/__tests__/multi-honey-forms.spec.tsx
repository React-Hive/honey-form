import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';

import type { HoneyFormApi, HoneyFormFieldsConfig } from '../../types';

import { MultiHoneyForms, useMultiHoneyFormsContext } from '../multi-honey-forms';
import { HoneyForm } from '../honey-form';

describe('Component [MultiHoneyForms]: Basic usage', () => {
  it('should add form to multi forms list by default', () => {
    type Form = {
      name: string;
    };

    let multiForms: HoneyFormApi<Form>[] = [];

    const AnyForm = () => {
      const { forms } = useMultiHoneyFormsContext<Form>();

      multiForms = forms;

      return <HoneyForm />;
    };

    render(
      <MultiHoneyForms>
        <AnyForm />
        <AnyForm />
      </MultiHoneyForms>,
    );

    expect(multiForms.length).toBe(2);
  });

  it('should not add form to multi forms list when forms management is disabled', () => {
    type Form = {
      name: string;
    };

    let multiForms: HoneyFormApi<Form>[] = [];

    const AnyForm = () => {
      const { forms } = useMultiHoneyFormsContext<Form>();

      multiForms = forms;

      return <HoneyForm />;
    };

    render(
      <MultiHoneyForms disableFormsManagement>
        <AnyForm />
      </MultiHoneyForms>,
    );

    expect(multiForms.length).toBe(0);
  });

  it('should submit multi forms data the when save button is clicked', async () => {
    type Form = {
      name: string;
    };

    const onSubmit = vitest.fn();

    const FruitForm = ({ formIndex }: { formIndex: number }) => {
      const fields: HoneyFormFieldsConfig<Form> = {
        name: {
          type: 'string',
        },
      };

      return (
        <HoneyForm fields={fields}>
          {({ formFields }) => (
            <input data-testid={`name[${formIndex}]`} {...formFields.name.props} />
          )}
        </HoneyForm>
      );
    };

    const { getByTestId } = render(
      <MultiHoneyForms onSubmit={onSubmit}>
        {({ submitForms }) => (
          <>
            <FruitForm formIndex={0} />
            <FruitForm formIndex={1} />

            <button onClick={submitForms} type="button" data-testid="save">
              Save
            </button>
          </>
        )}
      </MultiHoneyForms>,
    );

    fireEvent.change(getByTestId('name[0]'), { target: { value: 'Mango' } });
    fireEvent.change(getByTestId('name[1]'), { target: { value: 'Kiwi' } });

    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        [
          {
            name: 'Mango',
          },
          {
            name: 'Kiwi',
          },
        ],
        { context: undefined },
      ),
    );
  });
});
