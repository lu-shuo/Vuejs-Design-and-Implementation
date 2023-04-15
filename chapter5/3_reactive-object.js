import { effect, reactive } from './core.js'

// # 如何代理Object
// 在响应系统中，“读取”是一个很宽泛的概念，例如使用 in 操作符检查对象上是否具有给定的 key 也属于“读取”操作。
// 响应系统应该拦截一切读取操作，以便当数据变化时能够正确地触发响应。

// ## 下面列出了对一个普通对象的所有可能的读取操作:
// - 访问属性：obj.foo。
// - 判断对象或原型上是否存在给定的 key：key in obj。
// - 使用 for...in 循环遍历对象：for (const key in obj) {}。 for...in 语句循环一个对象所有可枚举的属性，包括自身的和继承的。
// ! Object不是一个可迭代对象iterable，不能使用for...of。iterable包括Array、Map、Set、arguments 等等
// * for...in 内部会通过一个EnumerateObjectProperties函数返回obj自身及其原型上的的所有可枚举属性的迭代器对象
// const obj = {
//   foo: 1,
// }
// const protoObj = {
//   bar: 2,
// }
// Reflect.setPrototypeOf(obj, protoObj)
// for (const key in obj) {
//   console.log(`${key}: ${obj[key]}`)
// }

// ## 对上面三种读取操作的拦截函数分别为：
// - get
// - has：in操作内部通过调用[[HasProperty]]实现，对应的拦截函数器为has
// - ownkeys：由上面可知，for...in操作内部调用EnumerateObjectProperties，EnumerateObjectProperties中会调用Reflect.ownKeys获取对象自身拥有的属性，对应的拦截器函数为ownKeys

// * 触发ITERATE_KEY相关联的副作用函数重新执行的时机
// - 给对象添加新属性

// * 避免触发ITERATE_KEY相关联的副作用函数重新执行的情形
// - 修改对象已有属性的值：无论怎么修改，对于for...in来说都只会执行一次，所以没必要重新执行，避免不必要的性能开销
// !无论是添加新属性还是更改已有属性，都是通过set拦截器实现，要实现上面的需求要求我们能在set中识别操作的类型

// ## 除了上面三种读取操作，还有最后一项工作要做，就是删除操作的代理
// delete操作内部调用[[Delete]]方法，该方法可以使用deleteproperty拦截器拦截

// # 合理的触发响应
// ## 给属性设置相同的值不需要触发响应
// ## 避免在对象的原型对象也为响应式对象时重复触发依赖更新

// # 综上所述，我们可以如下实现拦截
// * 具体实现参考core.js reactive函数
const obj = { foo: 1 }
const child = reactive(obj)

const proto = { bar: 2 }
const parent = reactive(proto)

Reflect.setPrototypeOf(child, parent)

// effect(() => {
//   console.log(child.foo)
// })
// child.foo = 1

effect(() => {
  console.log(child.bar)
})

child.bar = 3
