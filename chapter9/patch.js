/**
 * 简单Diff算法实现
 * @param {*} n1 旧子节点
 * @param {*} n2 新子节点
 * @param {*} container 容器
 */

// 子节点只可能有三种情况：
// 没有子节点，此时 vnode.children 的值为 null。
// 具有文本子节点，此时 vnode.children 的值为字符串，代表文本的内容。
// 其他情况，无论是单个元素子节点，还是多个子节点（可能是文本和元素的混合），都可以用数组来表示。
export function patchChildren(n1, n2, container) {}
