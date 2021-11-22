/* eslint-disable complexity */
export function isViewStatesEqual(x, y) {
  if (x === y) {
    return true;
  } else if (typeof x === 'number' && typeof y === 'number') {
    return Math.round(x * 1000) / 1000 === Math.round(y * 1000) / 1000;
  } else if (typeof x === 'object' && x !== null && (typeof y === 'object' && y !== null)) {
    for (const prop in x) {
      if (
        prop.indexOf('transition') === -1 &&
        (!y.hasOwnProperty(prop) || !isViewStatesEqual(x[prop], y[prop]))
      ) {
        return false;
      }
    }
    return true;
  }
  return false;
}
