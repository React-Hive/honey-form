import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';

import type {
  ChildHoneyFormFieldsConfig,
  HoneyFormFields,
  HoneyFormFieldsConfig,
  Nullable,
} from '../../types';

import { HoneyForm } from '../honey-form';
import { useHoneyFormContext } from '../honey-form.provider';
import { useChildHoneyForm } from '../../hooks';
import { ChildHoneyForm } from '../child-honey-form';

describe('Component [HoneyForm]: Nested forms', () => {
  type ItemForm = {
    id: string;
    name: string;
    price: number;
  };

  type ItemsForm = {
    companyName: string;
    items: ItemForm[];
  };

  type ItemFormProps = {
    formIndex: number;
  };

  let CHILD_FORM_ID = 0;

  const getNextChildFormId = () => {
    CHILD_FORM_ID += 1;

    return `${CHILD_FORM_ID}`;
  };

  beforeEach(() => {
    CHILD_FORM_ID = 0;
  });

  it('should submit updated item with new name and price on form submission', async () => {
    type ItemsForm = {
      items: ItemForm[];
    };

    const itemFormFields: ChildHoneyFormFieldsConfig<ItemsForm, 'items'> = {
      id: {
        type: 'string',
        required: true,
      },
      name: {
        type: 'string',
        required: true,
      },
      price: {
        type: 'number',
        required: true,
        defaultValue: 0,
      },
    };

    const onSubmit = jest.fn<Promise<void>, [ItemsForm]>();

    const ItemLineForm = ({ formIndex }: ItemFormProps) => {
      const { formFields: itemsFormFields } = useHoneyFormContext<ItemsForm>();

      return (
        <ChildHoneyForm
          formIndex={formIndex}
          parentField={itemsFormFields.items}
          fields={itemFormFields}
        >
          {({ formFields }) => (
            <>
              <input data-testid={`item[${formIndex}].name`} {...formFields.name.props} />
              <input data-testid={`item[${formIndex}].price`} {...formFields.price.props} />

              <button
                type="button"
                data-testid={`item[${formIndex}].removeItem`}
                onClick={() => itemsFormFields.items.removeValue(formIndex)}
              />
            </>
          )}
        </ChildHoneyForm>
      );
    };

    const fields: HoneyFormFieldsConfig<ItemsForm> = {
      items: {
        type: 'nestedForms',
        defaultValue: [
          {
            id: getNextChildFormId(),
            name: 'Banana',
            price: 5,
          },
        ],
      },
    };

    const { getByTestId } = render(
      <HoneyForm fields={fields} onSubmit={onSubmit}>
        {({ formFields }) => (
          <>
            {formFields.items.displayValue.map((itemForm, itemFormIndex) => (
              <ItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
            ))}

            <button type="submit" data-testid="save">
              Save
            </button>
          </>
        )}
      </HoneyForm>,
    );

    expect((getByTestId('item[0].name') as HTMLInputElement).value).toEqual('Banana');
    expect((getByTestId('item[0].price') as HTMLInputElement).value).toEqual('5');

    // Update values for the existent item
    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Orange' } });
    fireEvent.change(getByTestId('item[0].price'), { target: { value: '34' } });

    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          items: [
            {
              id: '1',
              name: 'Orange',
              price: 34,
            },
          ],
        },
        { context: undefined },
      ),
    );
  });

  it('should submit form with correct item values after dynamic addition', async () => {
    const itemFormFields: ChildHoneyFormFieldsConfig<ItemsForm, 'items'> = {
      id: {
        type: 'string',
        required: true,
      },
      name: {
        type: 'string',
        required: true,
      },
      price: {
        type: 'number',
        required: true,
        defaultValue: 0,
      },
    };

    const onSubmit = jest.fn<Promise<void>, [ItemsForm]>();

    const ItemLineForm = ({ formIndex }: ItemFormProps) => {
      const { formFields: itemsFormFields } = useHoneyFormContext<ItemsForm>();

      return (
        <ChildHoneyForm
          formIndex={formIndex}
          parentField={itemsFormFields.items}
          fields={itemFormFields}
        >
          {({ formFields }) => (
            <>
              <input data-testid={`item[${formIndex}].name`} {...formFields.name.props} />
              <input data-testid={`item[${formIndex}].price`} {...formFields.price.props} />

              <button
                type="button"
                data-testid={`item[${formIndex}].removeItem`}
                onClick={() => itemsFormFields.items.removeValue(formIndex)}
              />
            </>
          )}
        </ChildHoneyForm>
      );
    };

    const fields: HoneyFormFieldsConfig<ItemsForm> = {
      companyName: {
        type: 'string',
        defaultValue: 'test',
      },
      items: {
        type: 'nestedForms',
        defaultValue: [],
      },
    };

    const { getByTestId, queryByTestId } = render(
      <HoneyForm fields={fields} onSubmit={onSubmit}>
        {({ formFields }) => (
          <>
            {formFields.items.displayValue.map((itemForm, itemFormIndex) => (
              <ItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
            ))}

            <button
              type="button"
              data-testid="addItem"
              onClick={() =>
                formFields.items.pushValue({
                  id: getNextChildFormId(),
                  name: '',
                  price: undefined,
                })
              }
            >
              Add Item
            </button>

            <button type="submit" data-testid="save">
              Save
            </button>
          </>
        )}
      </HoneyForm>,
    );

    // Initial form submission attempt
    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          companyName: 'test',
          items: [],
        },
        { context: undefined },
      ),
    );
    onSubmit.mockClear();

    // Add a new item to the form
    fireEvent.click(getByTestId('addItem'));
    // Submit the form
    fireEvent.click(getByTestId('save'));

    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());

    // Enter values for the new item
    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Apple' } });
    fireEvent.change(getByTestId('item[0].price'), { target: { value: '10' } });

    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          companyName: 'test',
          items: [
            {
              id: '1',
              name: 'Apple',
              price: 10,
            },
          ],
        },
        { context: undefined },
      ),
    );
    onSubmit.mockClear();

    fireEvent.click(getByTestId('addItem'));
    fireEvent.click(getByTestId('save'));

    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
    onSubmit.mockClear();

    fireEvent.change(getByTestId('item[1].name'), { target: { value: 'Pear' } });
    fireEvent.change(getByTestId('item[1].price'), { target: { value: '30' } });

    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          companyName: 'test',
          items: [
            {
              id: '1',
              name: 'Apple',
              price: 10,
            },
            {
              id: '2',
              name: 'Pear',
              price: 30,
            },
          ],
        },
        { context: undefined },
      ),
    );
    onSubmit.mockClear();

    fireEvent.click(getByTestId('item[0].removeItem'));

    expect(queryByTestId('item[0].price')).not.toBeNull();
    expect(queryByTestId('item[1].price')).toBeNull();

    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          companyName: 'test',
          items: [
            {
              id: '2',
              name: 'Pear',
              price: 30,
            },
          ],
        },
        { context: undefined },
      ),
    );
  });

  it('should remove an item from the list when remove button is clicked', () => {
    const onSubmit = jest.fn<Promise<void>, [ItemsForm]>();

    const ItemLineForm = ({ formIndex }: ItemFormProps) => {
      const { formFields: itemsFormFields } = useHoneyFormContext<ItemsForm>();

      const { formFields } = useChildHoneyForm<ItemsForm, 'items', ItemForm>({
        formIndex,
        parentField: itemsFormFields.items,
        fields: {
          id: {
            type: 'string',
            required: true,
          },
          name: {
            type: 'string',
            required: true,
          },
          price: {
            type: 'number',
            required: true,
          },
        },
      });

      return (
        <>
          <input data-testid={`item[${formIndex}].name`} {...formFields.name.props} />
          <input data-testid={`item[${formIndex}].price`} {...formFields.price.props} />

          <button
            type="button"
            data-testid={`item[${formIndex}].removeItem`}
            onClick={() => itemsFormFields.items.removeValue(formIndex)}
          />
        </>
      );
    };

    const fields: HoneyFormFieldsConfig<ItemsForm> = {
      companyName: {
        type: 'string',
        defaultValue: 'test',
      },
      items: {
        type: 'nestedForms',
        defaultValue: [
          {
            id: '1',
            name: 'Apple',
            price: 10,
          },
          {
            id: '2',
            name: 'Pineapple',
            price: 45,
          },
        ],
      },
    };

    const { getByTestId, queryByTestId } = render(
      <HoneyForm fields={fields} onSubmit={onSubmit}>
        {({ formFields }) => (
          <>
            {formFields.items.displayValue.map((itemForm, itemFormIndex) => (
              <ItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
            ))}

            <button type="submit" data-testid="save">
              Save
            </button>
          </>
        )}
      </HoneyForm>,
    );

    fireEvent.click(getByTestId('item[0].removeItem'));

    expect(queryByTestId('item[0].price')).not.toBeNull();
    expect(queryByTestId('item[1].price')).toBeNull();

    expect((getByTestId('item[0].name') as HTMLInputElement).value).toEqual('Pineapple');
    expect((getByTestId('item[0].price') as HTMLInputElement).value).toEqual('45');
  });

  it('should remove items from the form and exclude them in the submitted data', async () => {
    const onSubmit = jest.fn<Promise<void>, [ItemsForm]>();

    const ItemLineForm = ({ formIndex }: ItemFormProps) => {
      const { formFields: itemsFormFields } = useHoneyFormContext<ItemsForm>();

      const { formFields } = useChildHoneyForm<ItemsForm, 'items', ItemForm>({
        formIndex,
        parentField: itemsFormFields.items,
        fields: {
          id: {
            type: 'string',
            required: true,
          },
          name: {
            type: 'string',
            required: true,
          },
          price: {
            type: 'number',
            required: true,
            defaultValue: 0,
          },
        },
      });

      return (
        <>
          <input data-testid={`item[${formIndex}].name`} {...formFields.name.props} />
          <input data-testid={`item[${formIndex}].price`} {...formFields.price.props} />

          <button
            type="button"
            data-testid={`item[${formIndex}].removeItem`}
            onClick={() => itemsFormFields.items.removeValue(formIndex)}
          />
        </>
      );
    };

    const fields: HoneyFormFieldsConfig<ItemsForm> = {
      companyName: {
        type: 'string',
        defaultValue: 'test',
      },
      items: {
        type: 'nestedForms',
        defaultValue: [],
      },
    };

    const { getByTestId, queryByTestId } = render(
      <HoneyForm fields={fields} onSubmit={onSubmit}>
        {({ formFields }) => (
          <>
            {formFields.items.displayValue.map((itemForm, itemFormIndex) => (
              <ItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
            ))}

            <button
              type="button"
              data-testid="addItem"
              onClick={() =>
                formFields.items.pushValue({
                  id: getNextChildFormId(),
                  name: '',
                  price: undefined,
                })
              }
            >
              Add Item
            </button>

            <button type="submit" data-testid="save">
              Save
            </button>
          </>
        )}
      </HoneyForm>,
    );

    // Add a new item to the form
    fireEvent.click(getByTestId('addItem'));
    fireEvent.click(getByTestId('addItem'));

    expect(queryByTestId('item[0].price')).not.toBeNull();
    expect(queryByTestId('item[1].price')).not.toBeNull();

    fireEvent.click(getByTestId('item[0].removeItem'));

    expect(queryByTestId('item[0].price')).not.toBeNull();
    expect(queryByTestId('item[1].price')).toBeNull();

    fireEvent.click(getByTestId('item[0].removeItem'));

    expect(queryByTestId('item[0].price')).toBeNull();
    expect(queryByTestId('item[1].price')).toBeNull();

    // Submit the form
    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          companyName: 'test',
          items: [],
        },
        { context: undefined },
      ),
    );

    expect(queryByTestId('item[0].price')).toBeNull();
    expect(queryByTestId('item[1].price')).toBeNull();

    // Add new item after deleting all items one by one
    fireEvent.click(getByTestId('addItem'));

    expect(queryByTestId('item[0].price')).not.toBeNull();

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Apple' } });
    fireEvent.change(getByTestId('item[0].price'), { target: { value: '30' } });

    // Submit the form
    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          companyName: 'test',
          items: [
            {
              id: '3',
              name: 'Apple',
              price: 30,
            },
          ],
        },
        { context: undefined },
      ),
    );
  });

  it('should set nested forms using parent field setValue()', async () => {
    type ItemForm = {
      id: string;
      name: string;
    };

    type ItemsForm = {
      items: ItemForm[];
    };

    const onSubmit = jest.fn<Promise<void>, [ItemsForm]>();

    const ItemLineForm = ({ formIndex }: ItemFormProps) => {
      const { formFields: itemsFormFields } = useHoneyFormContext<ItemsForm>();

      const { formFields } = useChildHoneyForm<ItemsForm, 'items', ItemForm>({
        formIndex,
        parentField: itemsFormFields.items,
        fields: {
          id: {
            type: 'string',
            required: true,
          },
          name: {
            type: 'string',
            required: true,
          },
        },
      });

      return <input data-testid={`item[${formIndex}].name`} {...formFields.name.props} />;
    };

    const fields: HoneyFormFieldsConfig<ItemsForm> = {
      items: {
        type: 'nestedForms',
        defaultValue: [],
      },
    };

    let formFieldsRef: Nullable<HoneyFormFields<ItemsForm>> = null;

    const { getByTestId, queryByTestId } = render(
      <HoneyForm fields={fields} onSubmit={onSubmit}>
        {({ formFields }) => {
          formFieldsRef = formFields;

          return (
            <>
              {formFields.items.displayValue.map((itemForm, itemFormIndex) => (
                <ItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
              ))}

              <button type="submit" data-testid="save">
                Save
              </button>
            </>
          );
        }}
      </HoneyForm>,
    );

    act(() =>
      formFieldsRef?.items.setValue([
        {
          id: getNextChildFormId(),
          name: 'Apple',
        },
        {
          id: getNextChildFormId(),
          name: 'Banana',
        },
      ]),
    );

    expect(queryByTestId('item[0].name')).not.toBeNull();
    expect(queryByTestId('item[1].name')).not.toBeNull();

    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          items: [
            {
              id: '1',
              name: 'Apple',
            },
            {
              id: '2',
              name: 'Banana',
            },
          ],
        },
        { context: undefined },
      ),
    );

    act(() =>
      formFieldsRef?.items.setValue([
        {
          id: '1',
          name: 'Pear',
        },
        {
          id: '2',
          name: 'Banana',
        },
      ]),
    );

    fireEvent.click(getByTestId('save'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          items: [
            {
              id: '1',
              name: 'Pear',
            },
            {
              id: '2',
              name: 'Banana',
            },
          ],
        },
        { context: undefined },
      ),
    );
  });
});
