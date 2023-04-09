// *computed

import { effect, track, trigger } from './core.js'

const data = {
  foo: 1,
  bar: 2,
}

const obj = new Proxy(data, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    trigger(target, key)
    return true
  },
})

// * 实现
// 1.computed可以看作是懒执行的副作用函数，只有当放访问obj.value时才会触发计算
function simpleComputed(getter) {
  const effectFn = effect(getter, {
    lazy: true,
  })

  const obj = {
    get value() {
      return effectFn()
    },
  }
  return obj
}

// 2.但是上面并没有做到computed的缓存特性，所以我们还要如下为其添加缓存功能
function cacheComputed(getter) {
  let value // *缓存上一次计算的值

  let dirty = true //* 标识是否需要重新计算，true代表“脏值”，需要重新计算

  const effectFn = effect(getter, {
    lazy: true,
  })

  const obj = {
    get value() {
      // * 只有“脏”时才计算值，并将结果缓存到value中
      if (dirty) {
        value = effectFn()
        dirty = false // *将dirty设为false，下次访问直接使用缓存到value的值
      }
      return value
    },
  }
  return obj
}

// 3.上面的方式还有一个问题，就是当修改obj.foo或者obj.bar时在访问computed的值不会发生变化
// 这是因为第一次访问之后，dirty的值一直为false
// 为此，我们需要给effect传递一个schedule，这样在obj.foo或者obj.bar变化时schedule会被执行，在schedule中我们将dirty设为true
function scheduleComputed(getter) {
  let value // *缓存上一次计算的值

  let dirty = true //* 标识是否需要重新计算，true代表“脏值”，需要重新计算

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      dirty = true
    },
  })

  const obj = {
    get value() {
      // * 只有“脏”时才计算值，并将结果缓存到value中
      if (dirty) {
        value = effectFn()
        dirty = false // *将dirty设为false，下次访问直接使用缓存到value的值
      }
      return value
    },
  }
  return obj
}

// 4.现在我们的计算属性已经趋于完美了，但是还有一个问题，在effect中访问computed的值时，当computed依赖的值发生变化，不会触发相应的effect重新执行
// 从本质上看，这是一个典型的effect嵌套：
// computed内部拥有自己的effectFn，并且它是懒执行的，computed的getter函数访问的变量只会把computed内部的effectFn收集为依赖。
// 而当computed作用域另一个effect时，就会发生effect嵌套，外层的effect不会被getter中的变量收集。
// 解决的方法也很简单，我们需要手动的触发依赖收集与更新
function computed(getter) {
  let value // *缓存上一次计算的值

  let dirty = true //* 标识是否需要重新计算，true代表“脏值”，需要重新计算

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      dirty = true
      // * 当计算属性依赖的响应式数据变化时，手动调用trigger函数触发响应式
      trigger(obj, 'value')
    },
  })

  const obj = {
    get value() {
      // * 只有“脏”时才计算值，并将结果缓存到value中
      if (dirty) {
        value = effectFn()
        dirty = false // *将dirty设为false，下次访问直接使用缓存到value的值
      }
      // * 当读取value时，手动调用track函数进行追踪
      track(obj, 'value')
      return value
    },
  }
  return obj
}

const sumRes = computed(() => {
  // console.log('computed getter')
  return obj.foo + obj.bar
})

console.log(sumRes.value)

effect(() => {
  console.log(sumRes.value)
})

obj.foo++
