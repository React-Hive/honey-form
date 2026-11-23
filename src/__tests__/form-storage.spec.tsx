import React, { useLayoutEffect, useReducer } from 'react';
import { flushSync } from 'react-dom';
import { act, render, renderHook, waitFor } from '@testing-library/react';

import { useHoneyForm } from '../hooks';
import { createHoneyFormSearchParams } from '../helpers';
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
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[@react-hive/honey-form] Form "profile": Cannot parse form values from the Local Storage: the encoded data is invalid or corrupted',
      );

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

    it('should open a form with the values a link was built with', () => {
      const fields = {
        query: {
          type: 'string',
        },
        page: {
          type: 'number',
          defaultValue: 1,
        },
      } as const;

      const searchParams = createHoneyFormSearchParams<Form>(fields, 'search', {
        query: 'honey',
      });

      expect(decodeStoredForm(searchParams.get('search'))).toStrictEqual({
        query: 'honey',
      });

      window.history.replaceState(null, '', `${window.location.pathname}?${searchParams}`);

      const { result } = renderHook(() =>
        useHoneyForm<Form>({
          name: 'search',
          storage: 'qs',
          readDefaultsFromStorage: true,
          fields,
        }),
      );

      expect(result.current.formFields.query.displayValue).toBe('honey');
      // Left out of the link, so the field's default
      expect(result.current.formFields.page.displayValue).toBe(1);
    });

    it('should build a link through the fields serializers', () => {
      type Brand = {
        id: string;
        label: string;
      };

      type FiltersForm = {
        brand: Brand;
      };

      const brands: Brand[] = [
        { id: 'anycubic', label: 'Anycubic' },
        { id: 'elegoo', label: 'Elegoo' },
      ];

      const fields = {
        brand: {
          type: 'object',
          serializer: (brand: Brand) => brand.id,
          deserializer: (id: unknown) => brands.find(brand => brand.id === id),
        },
      } as const;

      const searchParams = createHoneyFormSearchParams<FiltersForm>(fields, 'filters', {
        brand: brands[1],
      });

      expect(decodeStoredForm(searchParams.get('filters'))).toStrictEqual({
        brand: 'elegoo',
      });

      window.history.replaceState(null, '', `${window.location.pathname}?${searchParams}`);

      const { result } = renderHook(() =>
        useHoneyForm<FiltersForm>({
          name: 'filters',
          storage: 'qs',
          readDefaultsFromStorage: true,
          fields,
        }),
      );

      expect(result.current.formFields.brand.displayValue).toStrictEqual(brands[1]);
    });

    it('should keep the history entry state and the hash', () => {
      const historyState = { key: 'a1b2', idx: 2 };

      window.history.replaceState(historyState, '', `${window.location.pathname}#reviews`);

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

      expect(window.history.state).toStrictEqual(historyState);
      expect(window.location.hash).toBe('#reviews');
      expect(new URLSearchParams(window.location.search).has('search')).toBeTruthy();
    });

    describe('Back and Forward', () => {
      const fields = {
        query: {
          type: 'string',
        },
        page: {
          type: 'number',
          defaultValue: 1,
        },
      } as const;

      /**
       * Lands on a history entry with the query string given, as Back and Forward do.
       */
      const popHistoryEntry = (search: string) =>
        act(() => {
          window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${search}`,
          );

          window.dispatchEvent(new PopStateEvent('popstate'));
        });

      it('should restore the values the entry holds, without `onChange` and writing them back', () => {
        const onChange = vitest.fn();

        const { result } = renderHook(() =>
          useHoneyForm<Form>({
            name: 'search',
            storage: 'qs',
            readDefaultsFromStorage: true,
            fields,
            onChange,
          }),
        );

        act(() => result.current.formFields.query.setValue('honey'));

        onChange.mockClear();

        const entrySearchParams = createHoneyFormSearchParams<Form>(fields, 'search', {
          query: 'bee',
          page: 2,
        });

        entrySearchParams.set('cursor', 'c1');

        popHistoryEntry(`?${entrySearchParams}`);

        expect(result.current.formFields.query.displayValue).toBe('bee');
        expect(result.current.formFields.page.displayValue).toBe(2);
        expect(result.current.isFormDirty).toBeFalsy();
        expect(onChange).not.toHaveBeenCalled();
        expect(window.location.search).toBe(`?${entrySearchParams}`);
      });

      it('should restore the defaults the form was given where the entry holds no values', () => {
        const linkSearchParams = createHoneyFormSearchParams<Form>(fields, 'search', {
          query: 'honey',
          page: 3,
        });

        window.history.replaceState(null, '', `${window.location.pathname}?${linkSearchParams}`);

        const { result } = renderHook(() =>
          useHoneyForm<Form>({
            name: 'search',
            storage: 'qs',
            readDefaultsFromStorage: true,
            fields,
            defaults: {
              query: 'bee',
            },
          }),
        );

        expect(result.current.formFields.query.displayValue).toBe('honey');

        // The values the form was created with were read from the link, not given
        popHistoryEntry('?cursor=c1');

        expect(result.current.formFields.query.displayValue).toBe('bee');
        expect(result.current.formFields.page.displayValue).toBe(1);
      });

      it('should not render where the entry holds the values the form has', () => {
        let renderCount = 0;

        const { result } = renderHook(() => {
          renderCount += 1;

          return useHoneyForm<Form>({
            name: 'search',
            storage: 'qs',
            readDefaultsFromStorage: true,
            fields,
          });
        });

        // Neither the entry nor the form holds anything but the defaults
        popHistoryEntry('?cursor=c1');

        expect(renderCount).toBe(1);

        act(() => result.current.formFields.query.setValue('honey'));

        const renderCountAfterChange = renderCount;

        const nextPageSearchParams = new URLSearchParams(window.location.search);

        nextPageSearchParams.set('cursor', 'c2');

        popHistoryEntry(`?${nextPageSearchParams}`);

        expect(renderCount).toBe(renderCountAfterChange);
        expect(result.current.formFields.query.displayValue).toBe('honey');
      });

      it('should restore the values in the first render after Back or Forward, whichever it is', () => {
        const committedQueries: string[] = [];

        let renderAsRouter = () => {};
        let setQuery: (query: string) => void = () => {};

        const Component = () => {
          const [, rerender] = useReducer((renderCount: number) => renderCount + 1, 0);

          renderAsRouter = rerender;

          const { formValues, formFields } = useHoneyForm<Form>({
            name: 'search',
            storage: 'qs',
            readDefaultsFromStorage: true,
            fields,
          });

          setQuery = formFields.query.setValue;

          useLayoutEffect(() => {
            committedQueries.push(formValues.query);
          });

          return null;
        };

        // Added before the form's own listener and rendering at once, as a router's does under React 19
        const routerListener = () => flushSync(renderAsRouter);

        window.addEventListener('popstate', routerListener);

        render(<Component />);

        act(() => setQuery('honey'));

        committedQueries.length = 0;

        popHistoryEntry(
          `?${createHoneyFormSearchParams<Form>(fields, 'search', { query: 'bee' })}`,
        );

        expect(committedQueries).toStrictEqual(['bee']);

        window.removeEventListener('popstate', routerListener);
      });

      it('should not follow Back and Forward without `readDefaultsFromStorage`', () => {
        const { result } = renderHook(() =>
          useHoneyForm<Form>({
            name: 'search',
            storage: 'qs',
            fields,
          }),
        );

        act(() => result.current.formFields.query.setValue('honey'));

        popHistoryEntry(
          `?${createHoneyFormSearchParams<Form>(fields, 'search', { query: 'bee' })}`,
        );

        expect(result.current.formFields.query.displayValue).toBe('honey');
      });

      it('should stop following Back and Forward once unmounted', () => {
        const removeEventListenerSpy = vitest.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() =>
          useHoneyForm<Form>({
            name: 'search',
            storage: 'qs',
            readDefaultsFromStorage: true,
            fields,
          }),
        );

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

        removeEventListenerSpy.mockRestore();
      });
    });
  });
});
