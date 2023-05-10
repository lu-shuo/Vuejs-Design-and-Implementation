/**
 * @description: 类型判断
 * @param {*} target
 * @return {*}
 */
export const getType = (target) => {
  const type = typeof target
  if (type !== 'object') return type
  return Object.prototype.toString
    .call(target)
    .replace(/^\[object (\S+)\]$/, '$1')
}

export const isCollectionType = (target) => {
  return ['Set', 'Map', 'WeakSet', 'WeakMap'].includes(target)
}
