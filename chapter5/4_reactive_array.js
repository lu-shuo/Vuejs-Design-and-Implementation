import { effect, reactive } from './core.js'

// # 如何代理数组
// 数组其实就是一个特殊对象，搞清楚它与普通对象的区别便可以编写相应的响应式方法。

// * 数组对象是一个异质对象，它的[[DefineOwnProperty]]内部方法与常规对象不同。
// * 换句话说，除了上面一点，其他的都与普通对象无异，所以我们之前写的代理对象的代码大部分都可以通用
// const arr = reactive(['foo'])

// effect(() => {
//   console.log(arr[0])
// })

// arr[0] = 'bar'

// ## 对一个数组所有的“读取”操作：
// 通过索引访问数组元素值：arr[0]。
// 访问数组的长度：arr.length。
// 把数组作为对象，使用 for...in 循环遍历。
// 使用 for...of 迭代遍历数组。
// 数组的原型方法，如concat/join/every/some/find/findIndex/includes等，以及其他所有不改变原数组的原型方法。

// ## 对一个数组所有的“设置”操作：
// 通过索引修改数组元素值：arr[1] = 3。
// 修改数组长度：arr.length = 0。
// 数组的栈方法：push/pop/shift/unshift。
// 修改原数组的原型方法：splice/fill/sort 等。

// * 下面分别来实现对数组响应式的补充

// # 1. 索引和length
// * 1.通过索引改变数组导致length改变应该触发所有length相关的副作用重新执行
// const arr = reactive(['foo'])

// effect(() => {
//   console.log(arr.length)
// })

// arr[1] = 'bar'
// * 2.通过直接改变length会导致索引大于或等于当前length的值被改变，需要触发相关的副作用重新执行
// const arr = reactive(['foo', 'bar'])

// effect(() => {
//   console.log(arr[1])
// })

// arr.length = 0
// # 2. 遍历
// * 3.for...in遍历数组
// !不推荐对数组使用for...in，虽然可以
// 本质上还是运用ownKeys拦截器，在数组长度改变时重新执行for...in副作用
// const arr = reactive(['foo'])

// effect(() => {
//   for (const key in arr) {
//     console.log(key)
//   }
// })
// arr[1] = 'bar'
// arr.length = 1
// * 4.for...of
// 与 for...in 不同，for...of 是用来遍历可迭代对象（iterable object）的，因此我们需要先搞清楚什么是可迭代对象。
// ES2015 为 JavaScript 定义了迭代协议（iteration protocol），它不是新的语法，而是一种协议。具体来说，一个对象能否被迭代，取决于该对象或者该对象的原型是否实现了 @@iterator方法。
// 这里的 @@[name] 标志在 ECMAScript 规范里用来代指JavaScript 内建的 symbols 值，例如 @@iterator 指的就是Symbol.iterator 这个值。
// 如果一个对象实现了Symbol.iterator 方法，那么这个对象就是可以迭代的，例如：
// const obj = {
//   val: 0,
//   [Symbol.iterator]() {
//     return {
//       next() {
//         return {
//           value: obj.val++,
//           done: obj.val > 10 ? true : false,
//         }
//       },
//     }
//   },
// }
// for (const value of obj) {
//   console.log(value)
// }
// 数组内建了Symbol.iterator方法的实现，我们可以做一个实验：
// const arr = [1, 2, 3, 4, 5]
// const itr = arr[Symbol.iterator]()
// console.log(itr.next())
// console.log(itr.next())
// console.log(itr.next())
// console.log(itr.next())
// console.log(itr.next())
// console.log(itr.next())
// for...of在内部会读取数组的length及索引，下面是一个模拟实验：
// arr[Symbol.iterator] = function () {
//   const target = this
//   const len = target.length
//   let index = 0

//   return {
//     next() {
//       return {
//         value: index < len ? target[index] : undefined,
//         done: index++ >= len,
//       }
//     },
//   }
// }
// * 上面的例子表明，迭代数组时，只需要在副作用函数与数组的长度和索引之间建立响应联系即可
// const arr = reactive(['foo'])

// effect(() => {
//   for (const val of arr) {
//     console.log(val)
//   }
// })

// arr[1] = 'bar'
// arr.length = 1

// # 3. 数组的查找方法（includes/indexOf/lastIndexOf）
// 通过上一节的介绍我们意识到，数组的方法内部其实都依赖了对象的基本语义。所以大多数情况下，我们不需要做特殊处理即可让这些方法按预期工作，例如：
// const arr = reactive([1])

// effect(() => {
//   console.log(arr.includes(1))
// })

// arr[0] = 3
// 这是因为includes方法为了找到给定的值，它内部会访问数组的length属性以及数组的索引，因此当我们修改某个索引指向的元素值后能够触发响应。
// ## includes
// 然而includes方法并不总是按照预期工作，举个例子:
// const obj = {}
// const arr = reactive([obj])
// console.log(arr.includes(arr[0])) // false
// 以及：
// const obj = {}
// const arr = reactive([obj])
// console.log(arr.includes(obj)) // false

// # 4. 隐式修改数组长度的方法(push/pop/shift/unshift/splice)
// * 此类方法在执行时会隐式的读取length，会导致相关的副作用互相干扰，导致死循环栈溢出，例如
const arr = reactive([])

effect(() => {
  arr.push(0)
})

effect(() => {
  arr.push(1)
})

console.log(arr)
// 1. 第一个副作用函数执行。在该函数内，调用 arr.push 方法向数组中添加了一个元素。我们知道，调用数组的 push 方法会间接读取数组的 length 属性。所以，当第一个副作用函数执行完毕后，会与 length 属性建立响应联系。
// 2. 接着，第二个副作用函数执行。同样，它也会与 length 属性建立响应联系。但不要忘记，调用 arr.push 方法不仅会间接读取数组的 length 属性，还会间接设置 length 属性的值。
// 3. 第二个函数内的 arr.push 方法的调用设置了数组的 length 属性值。于是，响应系统尝试把与 length 属性相关联的副作用函数全部取出并执行，其中就包括第一个副作用函数。问题就出在这里，可以发现，第二个副作用函数还未执行完毕，就要再次执行第一个副作用函数了。
// 4. 第一个副作用函数再次执行。同样，这会间接设置数组的 length属性。于是，响应系统又要尝试把所有与 length 属性相关联的副作用函数取出并执行，其中就包含第二个副作用函数。
// 5. 如此循环往复，最终导致调用栈溢出。
// * 解决方法就是在执行这些方法的时候，屏蔽对’length‘的读取，即在读取length时不触发依赖收集
// * 这个思路是正确的，因为数组的 push 方法在语义上是修改操作，而非读取操作，所以避免建立响应联系并不会产生其他副作用。

// * 解决方法参照core.js
