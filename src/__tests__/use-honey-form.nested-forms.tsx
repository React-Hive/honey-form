import { act, renderHook } from '@testing-library/react';
import { useHoneyForm, useChildHoneyForm } from '../hooks';

describe('Nested field type', () => {
  it('should not fill any field props for nested forms field type', () => {
    type Item = {
      name: string;
    };

    const { result } = renderHook(() =>
      useHoneyForm<{ items: Item[] }>({
        fields: {
          items: {
            type: 'nestedForms',
          },
        },
      }),
    );

    expect(result.current.formFields.items.props).toBeUndefined();
    expect(result.current.formFields.items.passiveProps).toBeUndefined();
  });
});

describe('Nested forms', () => {
  it('should correctly identify the value type of an array field', () => {
    type Item = {
      name: string;
      weight: number;
    };

    type Products = {
      items: Item[];
    };

    const { result } = renderHook(() =>
      useHoneyForm<Products>({
        fields: {
          items: {
            type: 'nestedForms',
          },
        },
      }),
    );

    act(() => result.current.formFields.items.setValue([]));

    expect(result.current.formFields.items.displayValue).toStrictEqual([]);
  });

  it('should populate the parent field with default values from the child form initially', () => {
    type Item = {
      name: string;
      weight: number;
    };

    type Products = {
      items: Item[];
      name: string;
    };

    const { result: itemsResult } = renderHook(() =>
      useHoneyForm<Products>({
        fields: {
          items: {
            type: 'nestedForms',
            defaultValue: [],
          },
          name: {
            type: 'string',
          },
        },
      }),
    );

    const { unmount } = renderHook(() =>
      useChildHoneyForm<Products, 'items', Item>({
        formIndex: 0,
        parentField: itemsResult.current.formFields.items,
        fields: {
          name: {
            type: 'string',
          },
          weight: {
            type: 'number',
          },
        },
        defaults: {
          name: '',
          weight: 0,
        },
      }),
    );

    expect(itemsResult.current.formFields.items.getChildFormsValues()).toStrictEqual([
      {
        name: '',
        weight: 0,
      },
    ]);

    unmount();

    expect(itemsResult.current.formFields.items.getChildFormsValues()).toStrictEqual([]);
  });

  it('should submit form with updated item name in child form', async () => {
    type Item = {
      name: string;
    };

    type Products = {
      items: Item[];
    };

    const onSubmit = vitest.fn();

    const { result: itemsResult } = renderHook(() =>
      useHoneyForm<Products>({
        fields: {
          items: {
            type: 'nestedForms',
            defaultValue: [
              {
                name: 'Banana',
              },
            ],
          },
        },
        onSubmit,
      }),
    );

    const { result: itemResult1 } = renderHook(() =>
      useChildHoneyForm<Products, 'items', Item>({
        formIndex: 0,
        parentField: itemsResult.current.formFields.items,
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    act(() => itemResult1.current.formFields.name.setValue('Apple'));

    await act(() => itemsResult.current.submitForm());

    expect(onSubmit).toHaveBeenCalledWith(
      {
        items: [
          {
            name: 'Apple',
          },
        ],
      },
      expect.any(Object),
    );
  });

  it('should synchronize child form field values with the parent form field', () => {
    type Item = {
      name: string;
      weight: number;
    };

    type Products = {
      items: Item[];
    };

    const { result: itemsResult } = renderHook(() =>
      useHoneyForm<Products>({
        fields: {
          items: {
            type: 'nestedForms',
            defaultValue: [],
          },
        },
      }),
    );

    const { result: itemResult1, unmount: unmountItem1 } = renderHook(() =>
      useChildHoneyForm<Products, 'items', Item>({
        formIndex: 0,
        parentField: itemsResult.current.formFields.items,
        fields: {
          name: {
            type: 'string',
          },
          weight: {
            type: 'number',
          },
        },
      }),
    );

    const { result: itemResult2, unmount: unmountItem2 } = renderHook(() =>
      useChildHoneyForm<Products, 'items', Item>({
        formIndex: 1,
        parentField: itemsResult.current.formFields.items,
        fields: {
          name: {
            type: 'string',
          },
          weight: {
            type: 'number',
          },
        },
      }),
    );

    act(() => itemResult1.current.formFields.name.setValue('Apple'));

    expect(itemsResult.current.formFields.items.getChildFormsValues()).toStrictEqual([
      {
        name: 'Apple',
        weight: undefined,
      },
      {
        name: undefined,
        weight: undefined,
      },
    ]);

    act(() => itemResult2.current.formFields.name.setValue('Banana'));

    expect(itemsResult.current.formFields.items.getChildFormsValues()).toStrictEqual([
      {
        name: 'Apple',
        weight: undefined,
      },
      {
        name: 'Banana',
        weight: undefined,
      },
    ]);

    unmountItem1();

    expect(itemsResult.current.formFields.items.getChildFormsValues()).toStrictEqual([
      {
        name: 'Banana',
        weight: undefined,
      },
    ]);

    const { result: itemResult3 } = renderHook(() =>
      useChildHoneyForm<Products, 'items', Item>({
        formIndex: 1,
        parentField: itemsResult.current.formFields.items,
        fields: {
          name: {
            type: 'string',
          },
          weight: {
            type: 'number',
          },
        },
      }),
    );

    expect(itemsResult.current.formFields.items.getChildFormsValues()).toStrictEqual([
      {
        name: 'Banana',
        weight: undefined,
      },
      {
        name: undefined,
        weight: undefined,
      },
    ]);

    act(() => itemResult3.current.formFields.name.setValue('Apple'));

    expect(itemsResult.current.formFields.items.getChildFormsValues()).toStrictEqual([
      {
        name: 'Banana',
        weight: undefined,
      },
      {
        name: 'Apple',
        weight: undefined,
      },
    ]);

    unmountItem2();

    expect(itemsResult.current.formFields.items.getChildFormsValues()).toStrictEqual([
      {
        name: 'Apple',
        weight: undefined,
      },
    ]);
  });
});
