import { getLocalStorageCapabilities } from '@react-hive/honey-utils';

export const localStorageCapabilities = getLocalStorageCapabilities();

/**
 * How many times Back and Forward have moved the tab to another history entry. Counted by a
 * listener added on importing the package - before a router's, which an app adds on creating it -
 * so the first render after a move, whichever component's it is, finds the count moved.
 */
let historyMoveCount = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    historyMoveCount += 1;
  });
}

export const readHistoryMoveCount = () => historyMoveCount;
