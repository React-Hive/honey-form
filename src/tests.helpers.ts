export const defer = <T>(result: () => T, time = 0): Promise<T> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(result());
      } catch (e) {
        reject(e);
      }
    }, time);
  });
