const ENV = process.env.NODE_ENV || 'development';

export const __DEV__ = ENV !== 'production';

if (__DEV__ && typeof window !== 'undefined' && !process.env.JEST_WORKER_ID) {
  console.info(
    '[@react-hive/honey-form]: You are running in development mode. ' +
      'This build is not optimized for production and may include extra checks or logs.',
  );
}

export const HONEY_FORM_ERRORS = {
  emptyFormFieldsRef: '[@react-hive/honey-form]: The `formFieldsRef` value is null',
  submitHandlerOrOnSubmit:
    '[@react-hive/honey-form]: To submit the form, either provide a `submitHandler` function or implement an `onSubmit` callback function',
};
