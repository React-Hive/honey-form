const ENV = process.env.NODE_ENV || 'development';

export const __DEV__ = ENV !== 'production';

export const NPM_PACKAGE_NAME = '@react-hive/honey-form';

if (__DEV__ && typeof window !== 'undefined' && !process.env.VITEST_WORKER_ID) {
  console.info(
    `[${NPM_PACKAGE_NAME}]: You are running in development mode. ` +
      'This build is not optimized for production and may include extra checks or logs.',
  );
}

export const HONEY_FORM_ERRORS = {
  emptyFormFieldsRef: `[${NPM_PACKAGE_NAME}]: The \`formFieldsRef\` value is null`,
  submitHandlerOrOnSubmit: `[${NPM_PACKAGE_NAME}]: To submit the form, either provide a \`submitHandler\` function or implement an \`onSubmit\` callback function`,
};

export const HONEY_FORM_LS_PREFIX = 'honey-form-';
