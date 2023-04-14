import { track, trigger, effect } from './core.js'

// # Proxy
// ? 什么是 Proxy 呢？简单地说，使用 Proxy 可以创建一个代理对象。它能够实现对其他对象的代理，这里的关键词是其他对象，也就是说，Proxy 只能代理对象，无法代理非对象值，例如字符串、布尔值等。
// ? 什么是代理？所谓代理，指的是对一个对象基本语义的代理。它允许我们拦截并重新定义对一个对象的基本操作。
// ? 什么是基本语义？给出一个对象 obj，可以对它进行一些操作，例如读取属性值、设置属性值，类似这种读取、设置属性值的操作，就属于基本语义的操作，即基本操作。
// const obj = {
//   foo: 1,
//   fn() {
//     console.log(obj)
//   },
// }
// const p = new Proxy(obj, {
//   // 拦截读取属性操作
//   get() {
//     /*...*/
//   },
//   // 拦截设置属性操作
//   set() {
//     /*...*/
//   },
// })

// 在 JavaScript 的世界里，万物皆对象。例如一个函数也是一个对象，所以调用函数也是对一个对象的基本操作：
// const fn = (name) => {
//   console.log('我是:', name)
// }
// 因此，我们可以用 Proxy 来拦截函数的调用操作，这里我们使用apply 拦截函数的调用：
// const p2 = new Proxy(fn, {
//   apply(target, thisArg, argArray) {
//     target.call(thisArg, ...argArray)
//   },
// })
// p2('lushuo')

// ? Proxy 只能够拦截对一个对象的基本操作。那么，什么是非基本操作呢？
// obj.fn() // 这是典型的非基本操作。实际上，调用对象的方法由两个基本语义组成：第一个基本语义是 get，即先通过 get 操作得到 obj.fn 属性。第二个基本语义是函数调用，即通过 get 得到 obj.fn 的值后再调用它，也就是我们上面说到的 apply。

// * 理解 Proxy 只能够代理对象的基本语义很重要，后续我们讲解如何实现对数组或 Map、Set 等数据类型的代理时，都利用了 Proxy 的这个特点。

// # Reflect
// * Reflect是一个全局对象，它拥有许多方法，任何在 Proxy 的拦截器中能够找到的方法，都能够在 Reflect 中找到同名函数。
// console.log(Reflect.get(obj, 'foo'))
// * 看上面的代码似乎感觉不到Reflect存在的意义，那是因为Reflect还有第三个参数receiver，可以把它理解为函数调用过程中的this
// const obj1 = {
//   get foo() {
//     return this.foo
//   },
// }
// console.log(Reflect.get(obj1, 'foo', { foo: 2 }))

// # Reflect在响应式中的应用
// 在上一章中我们如下代理对象
const data = {
  foo: 1,
  get bar() {
    return this.foo
  },
}

// const obj2 = new Proxy(data, {
//   get(target, key) {
//     console.log(target === data, key)
//     track(target, key)
//     // !注意：这里并没有使用Reflect进行读取
//     return target[key]
//   },
//   set(target, key, newVal) {
//     target[key] = newVal
//     trigger(target, key)
//     return true
//   },
// })

// effect(() => {
//   console.log(obj2.bar)
// })

// 此时我们读取了obj2.bar，在bar的getter中访问了foo，此时我们认为该百年obj2.foo会触发effect再次执行
// obj2.foo++
// 然而并没有，这就是因为在get中，target[key]中的target为data，key为‘bar’，而data中bar的getter中的this为data
// 所以我们相当于在effect中访问了一个原始值，这不会触发依赖收集
// effect(() => {
//   console.log(data.foo)
// })
// 这时候Reflect的receiver参数就派上用场了

// * 如下面的代码所示，代理对象的 get 拦截函数接收第三个参数receiver，它代表谁在读取属性当我们使用代理对象 p 访问 bar 属性时，那么 receiver 就是p，你可以把它简单地理解为函数调用中的 this。
const obj2 = new Proxy(data, {
  get(target, key, receiver) {
    track(target, key)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, newVal) {
    target[key] = newVal
    trigger(target, key)
    return true
  },
})

effect(() => {
  console.log(obj2.bar)
})

obj2.foo++
