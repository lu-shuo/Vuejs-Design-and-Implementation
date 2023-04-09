// * watch
// * 本质上就是观测一个响应式数据，并在数据变化时通知并执行相应的回调
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
// 1.watch在本质上就是利用了effect以及options.scheduler选项，如下所示
// effect(
//   () => {
//     console.log(obj.foo)
//   },
//   {
//     scheduler(fn) {
//       // 当obj.foo变化时，会执行scheduler调度函数
//       console.log('scheduler')
//       fn()
//     },
//   }
// )
// obj.foo++
// 由此我们可以实现一个最简单的watch函数
function simpleWatch(source, cb) {
  effect(() => source.foo, {
    scheduler() {
      // 当obj.foo变化时，会执行scheduler调度函数
      cb()
    },
  })
}
// 2.但是上面的代码中我们硬编码了foo属性，为了实现通用性，我们实现一个通用的读取操作
function traverse(value, seen = new Set()) {
  // 如果要读取的数值是原始值或者已经被读取过了，那么什么都不做
  if (typeof value !== 'object' || value === null || seen.has(value)) return
  // 将value添加到seen中，代表已经被遍历的读取过了，避免循环引用引起的死循环
  seen.add(value)
  // 暂时不考虑数组等其他结构
  // 假设value就是一个对象，使用for in读取value的每个值，并用traverse递归处理
  for (const key in value) {
    traverse(value[key], seen)
  }
  return value
}
// 这样我们就能实现下面的访问对象上的任意属性都能触发cb的watch函数
function traverseWatch(source, cb) {
  effect(() => traverse(source), {
    scheduler() {
      // 当数据变化时，会执行scheduler调度函数
      cb()
    },
  })
}
// traverseWatch(obj, () => {
//   console.log('数据变化了')
// })

// obj.foo++

// 3.watch函数除了观测响应式数据，还可以接受一个getter函数作为参数
function getterWatch(source, cb) {
  let getter
  // 如果source为函数，说明用户传递的是getter，否则按照原来的逻辑递归读取对象的属性
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }
  effect(() => getter(), {
    scheduler() {
      // 当数据变化时，会执行scheduler调度函数
      cb()
    },
  })
}
// getterWatch(
//   () => obj.foo,
//   () => {
//     console.log('数据变化了')
//   }
// )
// obj.foo++

// 4.但是现在我们还缺失一个重要的能力，就是在watch的回调中拿到旧值与新值
// 这就要用到effect函数的lazy选项
function lazyWatch(source, cb) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let oldValue, newValue

  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      newValue = effectFn()
      cb(newValue, oldValue)
      oldValue = newValue // 更新旧值
    },
  })

  oldValue = effectFn() // 手动调用副作用函数拿到旧值
}

// lazyWatch(
//   () => obj.foo,
//   (newVal, oldValue) => {
//     console.log('数据变化了', newVal, oldValue)
//   }
// )
// obj.foo++

// 5.立即执行的watch函数
function immediateWatch(source, cb, options = {}) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let oldValue, newValue

  const job = () => {
    newValue = effectFn()
    cb(newValue, oldValue)
    oldValue = newValue // 更新旧值
  }

  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      job()
    },
  })

  if (options.immediate) {
    job()
  } else {
    oldValue = effectFn() // 手动调用副作用函数拿到旧值
  }
}
// immediateWatch(
//   () => obj.foo,
//   (newVal, oldValue) => {
//     console.log('数据变化了', newVal, oldValue)
//   },
//   {
//     immediate: true,
//   }
// )

// 6.vue3中watch还支持flush参数，表示cb将被放入微任务队列中并在DOM更新结束后执行
// flush: post / pre
// 原本的语义就是指组件更新前，更新后，这里暂时不模拟pre的情况
function flushWatch(source, cb, options = {}) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let oldValue, newValue

  const job = () => {
    newValue = effectFn()
    cb(newValue, oldValue)
    oldValue = newValue // 更新旧值
  }

  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      if (options.flush === 'post') {
        const p = Promise.resolve()
        p.then(job)
      } else {
        job()
      }
    },
  })

  if (options.immediate) {
    job()
  } else {
    oldValue = effectFn() // 手动调用副作用函数拿到旧值
  }
}

// 7.解决“竞态问题”
// 所谓“竞态问题”，常在多进程或多线程中被提及，前端似乎很少接触。但在日程工作中我们可能早就接触过此类问题，例如：
// let finalData
// flushWatch(obj, async() => {
//   const res = await fetch('/path/to/request')
//   finalData = res
// })
// 在上面的例子中，我们通过观测obj变化来发送网络请求，并将返回的数据赋值给finalData
// 乍一看似乎没问题，但仔细思考就会发现这是一个“竞态问题”
// 第一次修改obj -> 发送请求A
// 第二次修改obj -> 发送请求B
// 我们不知道A请求和B请求哪个会先返回，有可能A请求在B请求之后才返回，此时finalData被赋予A请求的值，这是不符合常理的，因为B是后发的，我们希望finalData最终是最新的值

// 对这个问题我们可以进一步总结：我们需要的是一个让副作用“过期”的手段
// 在Vue.js中，开发者给出了一个巧妙地方案：
function watch(source, cb, options = {}) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let oldValue, newValue

  let cleanup // 用来存储用户注册的过期回调
  const onInvalidate = (fn) => {
    cleanup = fn
  }

  const job = () => {
    newValue = effectFn()
    // 在调用回调函数之前，先调用过期回调
    if (cleanup) cleanup()
    // 将onInvalidate作为cb的第三个参数供用户使用
    cb(newValue, oldValue, onInvalidate)
    oldValue = newValue // 更新旧值
  }

  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      if (options.flush === 'post') {
        const p = Promise.resolve()
        p.then(job)
      } else {
        job()
      }
    },
  })

  if (options.immediate) {
    job()
  } else {
    oldValue = effectFn() // 手动调用副作用函数拿到旧值
  }
}

// 上面的代码中，开发者提供了onInvalidate函数作为cb的第三个参数，让用户可以注册一个过期回调，这样当新的watch回调执行时，会执行上次注册的过期回调，在过期回调中，我们就能拿到一个过期状态：
let finalData
watch(obj, async (newVal, oldVal, onInvalidate) => {
  let expired = false // “过期”标志
  onInvalidate(() => {
    expired = true
  })
  const res = await fetch('/path/to/request')
  if (!expired) {
    finalData = res
  }
})

// 由于watch的回调函数第一次执行的时候，我们已经注册了一个过期回调，所以watch的回调函数第二次执行之前会优先执行之前注册的过期回调，这会使第一次执行的副作用闭包中的expired变量变为true，即副作用已过期。
// 这样即使A的请求结果先返回，也会因为过期被丢弃掉，从而避免了过期副作用的影响，巧妙地解决了“竞态问题”
