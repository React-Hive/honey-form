import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';

import type {
  ChildHoneyFormFieldsConfig,
  HoneyFormApi,
  HoneyFormFields,
  HoneyFormFieldsConfig,
  HoneyFormParentField,
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

    const onSubmit = vitest.fn();

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
        expect.any(Object),
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

    const onSubmit = vitest.fn();

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
        expect.any(Object),
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
        expect.any(Object),
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
        expect.any(Object),
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
        expect.any(Object),
      ),
    );
  });

  it('should remove an item from the list when remove button is clicked', () => {
    const onSubmit = vitest.fn();

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
    const onSubmit = vitest.fn();

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
        expect.any(Object),
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
        expect.any(Object),
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

    const onSubmit = vitest.fn();

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
        expect.any(Object),
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
        expect.any(Object),
      ),
    );
  });
});

describe('Component [HoneyForm]: Nested forms state', () => {
  type ItemForm = {
    id: string;
    name: string;
  };

  type ItemsForm = {
    items: ItemForm[];
  };

  type ItemFormProps = {
    formIndex: number;
  };

  const itemFormFields: ChildHoneyFormFieldsConfig<ItemsForm, 'items'> = {
    id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
  };

  const fields: HoneyFormFieldsConfig<ItemsForm> = {
    items: {
      type: 'nestedForms',
      defaultValue: [
        {
          id: '1',
          name: 'Apple',
        },
      ],
    },
  };

  // Lets a render deferred to a timeout happen before the renders are counted
  const flushDeferredRenders = () => act(() => new Promise(resolve => setTimeout(resolve, 0)));

  const ItemLineForm = ({ formIndex }: ItemFormProps) => {
    const { formFields: itemsFormFields } = useHoneyFormContext<ItemsForm>();

    return (
      <ChildHoneyForm
        formIndex={formIndex}
        parentField={itemsFormFields.items}
        fields={itemFormFields}
      >
        {({ formFields, isFormDirty }) => (
          <input
            data-testid={`item[${formIndex}].name`}
            data-dirty={isFormDirty}
            {...formFields.name.props}
          />
        )}
      </ChildHoneyForm>
    );
  };

  let itemFormApi: Nullable<HoneyFormApi<ItemForm>> = null;

  const CapturedItemLineForm = ({ formIndex }: ItemFormProps) => {
    const { formFields: itemsFormFields } = useHoneyFormContext<ItemsForm>();

    return (
      <ChildHoneyForm
        formIndex={formIndex}
        parentField={itemsFormFields.items}
        fields={itemFormFields}
      >
        {childFormApi => {
          itemFormApi = childFormApi;

          return (
            <input
              data-testid={`item[${formIndex}].name`}
              {...childFormApi.formFields.name.props}
            />
          );
        }}
      </ChildHoneyForm>
    );
  };

  const renderSubmittedItemsForm = async (onRender = () => {}) => {
    const result = render(
      <HoneyForm fields={fields} onSubmit={vitest.fn()}>
        {({ formFields, isFormDirty, isFormValid, isFormSubmitted }) => {
          onRender();

          return (
            <>
              {formFields.items.displayValue.map((itemForm, itemFormIndex) => (
                <CapturedItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
              ))}

              <output
                data-testid="state"
                data-dirty={isFormDirty}
                data-valid={isFormValid}
                data-submitted={isFormSubmitted}
              />

              <button type="submit" data-testid="save">
                Save
              </button>
            </>
          );
        }}
      </HoneyForm>,
    );

    fireEvent.click(result.getByTestId('save'));

    await waitFor(() => expect(result.getByTestId('state').dataset.submitted).toBe('true'));

    return result;
  };

  it('should mark the parent form as dirty when a child form field changes', () => {
    const { getByTestId } = render(
      <HoneyForm fields={fields} onSubmit={vitest.fn()}>
        {({ formFields, isFormDirty }) => (
          <>
            {formFields.items.displayValue.map((itemForm, itemFormIndex) => (
              <ItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
            ))}

            <button type="submit" disabled={!isFormDirty} data-testid="save">
              Save
            </button>
          </>
        )}
      </HoneyForm>,
    );

    expect((getByTestId('save') as HTMLButtonElement).disabled).toBeTruthy();

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Orange' } });

    expect((getByTestId('save') as HTMLButtonElement).disabled).toBeFalsy();
  });

  it('should render the parent form only when it becomes dirty', async () => {
    let totalParentFormRenders = 0;
    let totalChildFormRenders = 0;

    const CountedItemLineForm = ({ formIndex }: ItemFormProps) => {
      const { formFields: itemsFormFields } = useHoneyFormContext<ItemsForm>();

      return (
        <ChildHoneyForm
          formIndex={formIndex}
          parentField={itemsFormFields.items}
          fields={itemFormFields}
        >
          {({ formFields }) => {
            totalChildFormRenders += 1;

            return <input data-testid={`item[${formIndex}].name`} {...formFields.name.props} />;
          }}
        </ChildHoneyForm>
      );
    };

    const { getByTestId } = render(
      <HoneyForm fields={fields} onSubmit={vitest.fn()}>
        {({ formFields }) => {
          totalParentFormRenders += 1;

          return formFields.items.displayValue.map((itemForm, itemFormIndex) => (
            <CountedItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
          ));
        }}
      </HoneyForm>,
    );

    expect(totalParentFormRenders).toBe(1);
    expect(totalChildFormRenders).toBe(1);

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Orange' } });
    await flushDeferredRenders();

    expect(totalParentFormRenders).toBe(2);
    expect(totalChildFormRenders).toBe(2);

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Pear' } });
    await flushDeferredRenders();

    expect(totalParentFormRenders).toBe(2);
    expect(totalChildFormRenders).toBe(3);
  });

  it('should render the parent and child forms once per child form change when the parent field is validated', async () => {
    let totalParentFormRenders = 0;
    let totalChildFormRenders = 0;

    const ValidatedItemLineForm = ({ formIndex }: ItemFormProps) => {
      const { formFields: itemsFormFields } = useHoneyFormContext<ItemsForm>();

      return (
        <ChildHoneyForm
          formIndex={formIndex}
          parentField={itemsFormFields.items}
          fields={itemFormFields}
          alwaysValidateParentField
        >
          {({ formFields }) => {
            totalChildFormRenders += 1;

            return <input data-testid={`item[${formIndex}].name`} {...formFields.name.props} />;
          }}
        </ChildHoneyForm>
      );
    };

    const { getByTestId } = render(
      <HoneyForm fields={fields} onSubmit={vitest.fn()}>
        {({ formFields }) => {
          totalParentFormRenders += 1;

          return formFields.items.displayValue.map((itemForm, itemFormIndex) => (
            <ValidatedItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
          ));
        }}
      </HoneyForm>,
    );

    expect(totalParentFormRenders).toBe(1);
    expect(totalChildFormRenders).toBe(1);

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Orange' } });
    await flushDeferredRenders();

    expect(totalParentFormRenders).toBe(2);
    expect(totalChildFormRenders).toBe(2);

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Pear' } });
    await flushDeferredRenders();

    expect(totalParentFormRenders).toBe(3);
    expect(totalChildFormRenders).toBe(3);
  });

  it('should mark the parent form as dirty again when a child form field changes after submitting', async () => {
    const onSubmit = vitest.fn();

    const { getByTestId } = render(
      <HoneyForm fields={fields} onSubmit={onSubmit}>
        {({ formFields, isFormDirty }) => (
          <>
            {formFields.items.displayValue.map((itemForm, itemFormIndex) => (
              <ItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
            ))}

            <button type="submit" disabled={!isFormDirty} data-testid="save">
              Save
            </button>
          </>
        )}
      </HoneyForm>,
    );

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Orange' } });
    fireEvent.click(getByTestId('save'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((getByTestId('save') as HTMLButtonElement).disabled).toBeTruthy());

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Pear' } });

    expect((getByTestId('save') as HTMLButtonElement).disabled).toBeFalsy();
  });

  it('should mark every form up to the root as dirty when a deeply nested form field changes', () => {
    type TagForm = {
      name: string;
    };

    type GroupForm = {
      id: string;
      tags: TagForm[];
    };

    type GroupsForm = {
      groups: GroupForm[];
    };

    const groupFormFields: ChildHoneyFormFieldsConfig<GroupsForm, 'groups'> = {
      id: {
        type: 'string',
      },
      tags: {
        type: 'nestedForms',
      },
    };

    const tagFormFields: ChildHoneyFormFieldsConfig<GroupForm, 'tags'> = {
      name: {
        type: 'string',
      },
    };

    type TagLineFormProps = {
      formIndex: number;
      parentField: HoneyFormParentField<GroupForm, 'tags'>;
    };

    const TagLineForm = ({ formIndex, parentField }: TagLineFormProps) => (
      <ChildHoneyForm formIndex={formIndex} parentField={parentField} fields={tagFormFields}>
        {({ formFields }) => (
          <input data-testid={`tag[${formIndex}].name`} {...formFields.name.props} />
        )}
      </ChildHoneyForm>
    );

    const GroupLineForm = ({ formIndex }: ItemFormProps) => {
      const { formFields: groupsFormFields } = useHoneyFormContext<GroupsForm>();

      return (
        <ChildHoneyForm
          formIndex={formIndex}
          parentField={groupsFormFields.groups}
          fields={groupFormFields}
        >
          {({ formFields, isFormDirty }) => (
            <div data-testid={`group[${formIndex}]`} data-dirty={isFormDirty}>
              {formFields.tags.displayValue?.map((_, tagFormIndex) => (
                <TagLineForm
                  key={tagFormIndex}
                  formIndex={tagFormIndex}
                  parentField={formFields.tags}
                />
              ))}
            </div>
          )}
        </ChildHoneyForm>
      );
    };

    const groupsFields: HoneyFormFieldsConfig<GroupsForm> = {
      groups: {
        type: 'nestedForms',
        defaultValue: [
          {
            id: '1',
            tags: [
              {
                name: 'Fruit',
              },
            ],
          },
        ],
      },
    };

    const { getByTestId } = render(
      <HoneyForm fields={groupsFields} onSubmit={vitest.fn()}>
        {({ formFields, isFormDirty }) => (
          <>
            {formFields.groups.displayValue.map((groupForm, groupFormIndex) => (
              <GroupLineForm key={groupForm.id} formIndex={groupFormIndex} />
            ))}

            <button type="submit" disabled={!isFormDirty} data-testid="save">
              Save
            </button>
          </>
        )}
      </HoneyForm>,
    );

    expect(getByTestId('group[0]').dataset.dirty).toBe('false');
    expect((getByTestId('save') as HTMLButtonElement).disabled).toBeTruthy();

    fireEvent.change(getByTestId('tag[0].name'), { target: { value: 'Vegetable' } });

    expect(getByTestId('group[0]').dataset.dirty).toBe('true');
    expect((getByTestId('save') as HTMLButtonElement).disabled).toBeFalsy();
  });

  it('should not mark the parent and child forms as dirty when the parent field value is set without marking dirty', () => {
    let formFieldsRef: Nullable<HoneyFormFields<ItemsForm>> = null;

    const { getByTestId } = render(
      <HoneyForm fields={fields} onSubmit={vitest.fn()}>
        {({ formFields, isFormDirty }) => {
          formFieldsRef = formFields;

          return (
            <>
              {formFields.items.displayValue.map((itemForm, itemFormIndex) => (
                <ItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
              ))}

              <button type="submit" disabled={!isFormDirty} data-testid="save">
                Save
              </button>
            </>
          );
        }}
      </HoneyForm>,
    );

    act(() =>
      formFieldsRef?.items.setValue(
        [
          {
            id: '1',
            name: 'Orange',
          },
        ],
        {
          dirty: false,
        },
      ),
    );

    expect((getByTestId('item[0].name') as HTMLInputElement).value).toBe('Orange');
    expect(getByTestId('item[0].name').dataset.dirty).toBe('false');
    expect((getByTestId('save') as HTMLButtonElement).disabled).toBeTruthy();
  });

  it('should clear the parent form valid and submitted states when a child form field changes', async () => {
    let totalParentFormRenders = 0;

    const { getByTestId } = await renderSubmittedItemsForm(() => {
      totalParentFormRenders += 1;
    });

    expect(getByTestId('state').dataset.valid).toBe('true');

    const totalSubmittedFormRenders = totalParentFormRenders;

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Orange' } });
    await flushDeferredRenders();

    expect(getByTestId('state').dataset).toMatchObject({
      dirty: 'true',
      valid: 'false',
      submitted: 'false',
    });
    expect(totalParentFormRenders).toBe(totalSubmittedFormRenders + 1);

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Pear' } });
    await flushDeferredRenders();

    expect(totalParentFormRenders).toBe(totalSubmittedFormRenders + 1);
  });

  it('should clear the parent form valid and submitted states without marking it dirty when a child form field is set without marking dirty', async () => {
    const { getByTestId } = await renderSubmittedItemsForm();

    act(() => itemFormApi?.formFields.name.setValue('Orange', { dirty: false }));

    expect(getByTestId('state').dataset).toMatchObject({
      dirty: 'false',
      valid: 'false',
      submitted: 'false',
    });
  });

  it('should clear the parent form valid and submitted states and mark it dirty when child form values are set', async () => {
    const { getByTestId } = await renderSubmittedItemsForm();

    act(() => itemFormApi?.setFormValues({ name: 'Orange' }));

    expect(getByTestId('state').dataset).toMatchObject({
      dirty: 'true',
      valid: 'false',
      submitted: 'false',
    });
  });

  it('should keep the parent form states when child form values are set without marking dirty', async () => {
    const { getByTestId } = await renderSubmittedItemsForm();

    act(() => itemFormApi?.setFormValues({ name: 'Orange' }, { dirty: false }));

    expect(getByTestId('state').dataset).toMatchObject({
      dirty: 'false',
      valid: 'true',
      submitted: 'true',
    });
  });

  it('should clear the parent form valid and submitted states without marking it dirty when a child form is reset', async () => {
    let totalParentFormRenders = 0;

    const { getByTestId } = await renderSubmittedItemsForm(() => {
      totalParentFormRenders += 1;
    });

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Orange' } });
    fireEvent.click(getByTestId('save'));

    await waitFor(() => expect(getByTestId('state').dataset.submitted).toBe('true'));
    expect(getByTestId('state').dataset.dirty).toBe('false');

    const totalSubmittedFormRenders = totalParentFormRenders;

    act(() => itemFormApi?.resetForm());
    await flushDeferredRenders();

    expect((getByTestId('item[0].name') as HTMLInputElement).value).toBe('Apple');
    expect(getByTestId('state').dataset).toMatchObject({
      dirty: 'false',
      valid: 'false',
      submitted: 'false',
    });
    expect(totalParentFormRenders).toBe(totalSubmittedFormRenders + 1);
  });

  it('should validate the parent field with the reset values of a child form', () => {
    const validatedItems: unknown[] = [];

    const validatedFields: HoneyFormFieldsConfig<ItemsForm> = {
      items: {
        type: 'nestedForms',
        defaultValue: [
          {
            id: '1',
            name: 'Apple',
          },
        ],
        validator: items => {
          validatedItems.push(items);

          return true;
        },
      },
    };

    const { getByTestId } = render(
      <HoneyForm fields={validatedFields} onSubmit={vitest.fn()}>
        {({ formFields }) =>
          formFields.items.displayValue.map((itemForm, itemFormIndex) => (
            <CapturedItemLineForm key={itemForm.id} formIndex={itemFormIndex} />
          ))
        }
      </HoneyForm>,
    );

    fireEvent.change(getByTestId('item[0].name'), { target: { value: 'Orange' } });

    act(() => itemFormApi?.resetForm());

    expect(validatedItems.at(-1)).toStrictEqual([
      {
        id: '1',
        name: 'Apple',
      },
    ]);
  });
});
