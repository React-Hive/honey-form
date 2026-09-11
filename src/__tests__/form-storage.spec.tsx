import { act, renderHook, waitFor } from '@testing-library/react';

import { useHoneyForm } from '../hooks';
import { HONEY_FORM_LS_PREFIX } from '../constants';

const encodeForm = (form: object) => window.btoa(encodeURI(JSON.stringify(form)));

const decodeStoredForm = (raw: string | null) =>
  raw === null ? null : (JSON.parse(decodeURI(window.atob(raw))) as object);

const getLsKey = (formName: string) => `${HONEY_FORM_LS_PREFIX}${formName}`;

describe('Form storage', () => {
  afterEach(() => {
    localStorage.clear();

    window.history.replaceState(null, '', window.location.pathname);
  });

  it('should throw when storage is set without a form name', () => {
    const consoleErrorSpy = vitest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() =>
        useHoneyForm<{ name: string }>({
          storage: 'ls',
          fields: {
            name: {
              type: 'string',
            },
          },
        }),
      ),
    ).toThrow('The form name is required when any form data storage is used');

    consoleErrorSpy.mockRestore();
  });

  it('should not persist anything when storage is not configured', () => {
    const { result } = renderHook(() =>
      useHoneyForm<{ name: string }>({
        name: 'profile',
        fields: {
          name: {
            type: 'string',
          },
        },
      }),
    );

    act(() => result.current.formFields.name.setValue('Apple'));

    expect(localStorage.length).toBe(0);
    expect(window.location.search).toBe('');
  });

  describe('Local storage', () => {
    type Form = {
      name: string;
      age: number;
    };

    it('should save submit values to local storage on every change', () => {
      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'profile',
          storage: 'ls',
          fields: {
            name: {
              type: 'string',
            },
            age: {
              type: 'number',
            },
          },
        }),
      );

      // Nothing is stored until the first change
      expect(localStorage.getItem(getLsKey('profile'))).toBeNull();

      act(() => result.current.formFields.name.setValue('Apple'));

      expect(decodeStoredForm(localStorage.getItem(getLsKey('profile')))).toStrictEqual({
        name: 'Apple',
      });

      act(() => result.current.formFields.age.setValue(42));

      expect(decodeStoredForm(localStorage.getItem(getLsKey('profile')))).toStrictEqual({
        name: 'Apple',
        age: 42,
      });
    });

    it('should use stored values as defaults when `readDefaultsFromStorage` is set', () => {
      localStorage.setItem(getLsKey('profile'), encodeForm({ name: 'Apple', age: 42 }));

      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'profile',
          storage: 'ls',
          readDefaultsFromStorage: true,
          fields: {
            name: {
              type: 'string',
            },
            age: {
              type: 'number',
            },
          },
          defaults: {
            // Stored values must override the form defaults
            name: 'Banana',
          },
        }),
      );

      expect(result.current.formFields.name.displayValue).toBe('Apple');
      expect(result.current.formFields.age.displayValue).toBe(42);
      expect(result.current.formFields.age.props.value).toBe('42');

      expect(result.current.formDefaultValues).toStrictEqual({
        name: 'Apple',
        age: 42,
      });

      expect(result.current.isFormDirty).toBeFalsy();
      // Automatic restoring must not offer the manual restoring
      expect(result.current.hasUnsubmittedForm).toBeFalsy();
    });

    it('should detect an unsubmitted form and restore it on demand', async () => {
      localStorage.setItem(getLsKey('profile'), encodeForm({ name: 'Apple' }));

      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'profile',
          storage: 'ls',
          fields: {
            name: {
              type: 'string',
            },
            age: {
              type: 'number',
            },
          },
        }),
      );

      await waitFor(() => expect(result.current.hasUnsubmittedForm).toBeTruthy());

      // Values are not applied until restoring is requested
      expect(result.current.formFields.name.displayValue).toBeUndefined();

      act(() => result.current.restoreUnsubmittedForm());

      expect(result.current.formFields.name.displayValue).toBe('Apple');
      expect(result.current.formFields.age.displayValue).toBeUndefined();
      expect(result.current.isFormDirty).toBeTruthy();
    });

    it('should not detect an unsubmitted form when nothing is stored', () => {
      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'profile',
          storage: 'ls',
          fields: {
            name: {
              type: 'string',
            },
            age: {
              type: 'number',
            },
          },
        }),
      );

      expect(result.current.hasUnsubmittedForm).toBeFalsy();
    });

    it('should remove the stored form after a successful submit', async () => {
      const onSubmit = vitest.fn<() => Promise<void>>();

      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'profile',
          storage: 'ls',
          fields: {
            name: {
              type: 'string',
            },
            age: {
              type: 'number',
            },
          },
          onSubmit,
        }),
      );

      act(() => result.current.formFields.name.setValue('Apple'));

      expect(localStorage.getItem(getLsKey('profile'))).not.toBeNull();

      await act(() => result.current.submitForm());

      expect(onSubmit).toHaveBeenCalledWith({ name: 'Apple', age: undefined }, expect.anything());
      expect(localStorage.getItem(getLsKey('profile'))).toBeNull();
    });

    it('should keep the stored form when submit returns server errors', async () => {
      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'profile',
          storage: 'ls',
          fields: {
            name: {
              type: 'string',
            },
            age: {
              type: 'number',
            },
          },
          onSubmit: async () => ({
            name: ['Name is already taken'],
          }),
        }),
      );

      act(() => result.current.formFields.name.setValue('Apple'));

      await act(() => result.current.submitForm());

      expect(result.current.formErrors).toStrictEqual({
        name: [
          {
            type: 'server',
            message: 'Name is already taken',
          },
        ],
      });

      expect(decodeStoredForm(localStorage.getItem(getLsKey('profile')))).toStrictEqual({
        name: 'Apple',
      });
    });

    it('should remove the stored form on reset', () => {
      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'profile',
          storage: 'ls',
          fields: {
            name: {
              type: 'string',
            },
            age: {
              type: 'number',
            },
          },
        }),
      );

      act(() => result.current.formFields.name.setValue('Apple'));

      expect(localStorage.getItem(getLsKey('profile'))).not.toBeNull();

      act(() => result.current.resetForm());

      expect(result.current.formFields.name.displayValue).toBeUndefined();
      expect(localStorage.getItem(getLsKey('profile'))).toBeNull();
    });

    it('should apply field serializer and deserializer', () => {
      type TagsForm = {
        tags: string[];
      };

      const fields = {
        tags: {
          type: 'object',
          serializer: (tags: string[]) => tags.join(','),
          deserializer: (raw: unknown) => String(raw).split(','),
        },
      } as const;

      const { result } = renderHook(() =>
        useHoneyForm<TagsForm>({
          name: 'tags',
          storage: 'ls',
          fields,
        }),
      );

      act(() => result.current.formFields.tags.setValue(['react', 'forms']));

      expect(decodeStoredForm(localStorage.getItem(getLsKey('tags')))).toStrictEqual({
        tags: 'react,forms',
      });

      const { result: restoredResult } = renderHook(() =>
        useHoneyForm<TagsForm>({
          name: 'tags',
          storage: 'ls',
          readDefaultsFromStorage: true,
          fields,
        }),
      );

      expect(restoredResult.current.formFields.tags.displayValue).toStrictEqual(['react', 'forms']);
    });

    it('should fall back to defaults and warn when the stored data is corrupted', () => {
      const consoleWarnSpy = vitest.spyOn(console, 'warn').mockImplementation(() => {});

      localStorage.setItem(getLsKey('profile'), '%%% not base64 %%%');

      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'profile',
          storage: 'ls',
          readDefaultsFromStorage: true,
          fields: {
            name: {
              type: 'string',
              defaultValue: 'Banana',
            },
            age: {
              type: 'number',
            },
          },
        }),
      );

      expect(result.current.formFields.name.displayValue).toBe('Banana');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid or corrupted'));

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Query string', () => {
    type Form = {
      query: string;
      page: number;
    };

    it('should save submit values to the query string on every change', () => {
      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'search',
          storage: 'qs',
          fields: {
            query: {
              type: 'string',
            },
            page: {
              type: 'number',
              defaultValue: 1,
            },
          },
        }),
      );

      expect(window.location.search).toBe('');

      act(() => result.current.formFields.query.setValue('honey'));

      const searchParams = new URLSearchParams(window.location.search);

      expect(decodeStoredForm(searchParams.get('search'))).toStrictEqual({
        query: 'honey',
        page: 1,
      });
    });

    it('should use query string values as defaults when `readDefaultsFromStorage` is set', () => {
      const searchParams = new URLSearchParams();
      searchParams.set('search', encodeForm({ query: 'honey', page: 3 }));

      window.history.replaceState(null, '', `${window.location.pathname}?${searchParams}`);

      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'search',
          storage: 'qs',
          readDefaultsFromStorage: true,
          fields: {
            query: {
              type: 'string',
            },
            page: {
              type: 'number',
              defaultValue: 1,
            },
          },
        }),
      );

      expect(result.current.formFields.query.displayValue).toBe('honey');
      expect(result.current.formFields.page.displayValue).toBe(3);
      // Manual restoring is only supported for local storage
      expect(result.current.hasUnsubmittedForm).toBeFalsy();
    });

    it('should keep unrelated query string parameters intact', () => {
      window.history.replaceState(null, '', `${window.location.pathname}?tab=settings`);

      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'search',
          storage: 'qs',
          fields: {
            query: {
              type: 'string',
            },
            page: {
              type: 'number',
            },
          },
        }),
      );

      act(() => result.current.formFields.query.setValue('honey'));

      const searchParams = new URLSearchParams(window.location.search);

      expect(searchParams.get('tab')).toBe('settings');
      expect(decodeStoredForm(searchParams.get('search'))).toStrictEqual({
        query: 'honey',
      });
    });
  });
});
