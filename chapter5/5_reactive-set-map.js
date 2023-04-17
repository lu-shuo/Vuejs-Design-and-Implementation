import { effect, reactive } from './core.js'

// # 集合类型的响应式方案
// * 集合类型包括Set、Map、Weakset、WeakMap
// 使用Proxy代理集合类型的数据不同于代理普通对象，因为集合类型数据的操作与普通对象存在很大的不同。下面总结了Set和Map这两个数据类型的原型属性和方法。

// ## Set类型的原型属性和方法如下:
// size：返回集合中元素的数量。
// add(value)：向集合中添加给定的值。
// clear()：清空集合。
// delete(value)：从集合中删除给定的值。
// has(value)：判断集合中是否存在给定的值。
// keys()：返回一个迭代器对象。可用于for...of循环，迭代器对象产生的值为集合中的元素值。
// values()：对于Set集合类型来说，keys()与values()等价。
// entries()：返回一个迭代器对象。迭代过程中为集合中的每一个元素产生一个数组值[value, value]。
// forEach(callback[, thisArg])：forEach函数会遍历集合中的所有元素，并对每一个元素调用callback函数。forEach函数接收可选的第二个参数thisArg，用于指定callback函数执行时的this值。

// ## Map类型的原型属性和方法如下:
// size：返回Map数据中的键值对数量。
// clear()：清空Map。
// delete(key)：删除指定key的键值对。
// has(key)：判断Map中是否存在指定key的键值对。
// get(key)：读取指定key对应的值。
// set(key, value)：为Map设置新的键值对。
// keys()：返回一个迭代器对象。迭代过程中会产生键值对的key 值。
// values()：返回一个迭代器对象。迭代过程中会产生键值对的value值。
// entries()：返回一个迭代器对象。迭代过程中会产生由[key,value]组成的数组值。
// forEach(callback[, thisArg])：forEach函数会遍历Map数据的所有键值对，并对每一个键值对调用callback函数。forEach函数接收可选的第二个参数thisArg，用于指定callback函数执行时的this值。

// * 集合类型不像普通对象那样直接通过key访问属性，它们有一套特定的方法操作自身，所以不能像代理普通对象一样代理集合类型。
// * 当总体思路不变：当读取操作发生时，track；当设置操作发生时，trigger。

// const s = new Set([1, 2, 3])
// const p = new Proxy(s, {})
// console.log(p.size) // Method get Set.prototype.size called on incompatible receiver #<Set>at get size (<anonymous>)

const obj = {
  foo: 1,
  get bar() {
    return this.foo
  },
}

const p = reactive(obj)

effect(() => {
  console.log(p.bar)
})

p.foo++
