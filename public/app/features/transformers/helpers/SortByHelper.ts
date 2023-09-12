import { getLinkToDocs } from './getLinkToDocs';

export const SortByHelper = () => {
  return `
  This transformation will sort each frame by the configured field, When 'reverse' is checked, the values will return in the opposite order.
  ${getLinkToDocs()}
  `;
};
