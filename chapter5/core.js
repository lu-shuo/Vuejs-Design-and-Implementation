import { isCollectionType } from './utils.js'

const bucket = new WeakMap() // WeakMap { target: Map { key: Set [effectFn0, effectFn1, ...] } }
export const ITERATE_KEY = Symbol() // ownKeys操作对应的唯一标识
const RAW_KEY = Symbol() // 响应式对象可通过RAW_KEY访问代理的原始对象，使用Symbol避免与用户自定义属性冲突
export const TriggerType = {
  ADD: 'ADD',
  SET: 'SET',
  DELETE: 'DELETE',
}
let shouldTrack = true // 是否进行依赖收集

let activeEffect // 当前的副作用函数

const effectStack = []

// *支持用户传入options
// *设置options.lazy标志懒执行，返回当前包装的副作用函数，并将真正的副作用函数的结果作为包装函数的返回值，在需要的时候再执行取到计算结果（computed）
export function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn) // *解决分支遗留副作用
    activeEffect = effectFn
    effectStack.push(effectFn) // *解决嵌套的effect
    const res = fn() // * 新增：将真正的副作用函数fn的返回值作为effectFn返回值返回
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    return res
  }

  effectFn.options = options

  effectFn.deps = []

  if (!options.lazy) {
    effectFn()
  }

  return effectFn
}

// 每次执行前清除所有与之关联的依赖
function cleanup(effectFn) {
  effectFn.deps.forEach((deps) => {
    deps.delete(effectFn)
  })

  effectFn.deps.length = 0 // 重置deps
}

// 跟踪收集依赖的部分可以封装为track函数
export function track(target, key) {
  if (!activeEffect || !shouldTrack) return // * 没有带注册副作用或者禁止追踪时，直接return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)

  activeEffect.deps.push(deps) // *将当前依赖添加进副作用函数的依赖集合中
}

// 触发副作用函数的部分封装为trigger
export function trigger(target, key, type, newVal) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  // * 取得与key相关联的副作用函数
  const effects = depsMap.get(key)
  // * 取得与ITERATE_KEY相关联的副作用函数
  const iterateEffects = depsMap.get(ITERATE_KEY)

  const effectsToRun = new Set()

  // * 将与key相关联的副作用函数添加到effectsToRun
  effects &&
    effects.forEach((effectFn) => {
      // *如果trigger触发的副作用函数与当前正在执行的副作用函数相同，则不触发执行。避免++死循环
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  // * 只有当操作类型为'ADD'或者'DELETE'时，才触发与ITERATE_KEY关联的副作用函数重新执行
  if (type === TriggerType.ADD || type === TriggerType.DELETE) {
    iterateEffects &&
      iterateEffects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn)
        }
      })
  }
  // * 当操作类型为'ADD'且数据类型为数组时，取出并执行与length属性关联的副作用函数
  if (type === TriggerType.ADD && Array.isArray(target)) {
    const lengthEffects = depsMap.get('length')
    lengthEffects &&
      lengthEffects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
          effectsToRun.add(effectFn)
        }
      })
  }
  // * 当操作类型为数组且改变的是数组的length时
  if (Array.isArray(target) && key === 'length') {
    // * 对于索引大于等于length的所有属性，取出相关的所有副作用函数添加到执行队列中
    depsMap.forEach((effects, key) => {
      if (key >= newVal) {
        effects.forEach((effectFn) => {
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
          }
        })
      }
    })
  }
  effectsToRun.forEach((effectFn) => {
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}

// * 覆盖数组上的查找方法，解决深层响应式带来的查找问题 [{ }]
const arrayInstrumentations = {}
;['includes', 'indexOf', 'lastIndexOf'].forEach((method) => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    // * this是代理对象，现在代理对象中查找
    let res = originMethod.apply(this, args)
    if (res === false || res === -1) {
      // * 代理对象中没有，再从原始对象中查找
      res = originMethod.apply(this[RAW_KEY], args)
    }
    return res
  }
})
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach((method) => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    // * 调用原始方法前，禁止追踪，解决读取length时触发依赖收集的问题
    shouldTrack = false
    const res = originMethod.apply(this, args)
    shouldTrack = true
    return res
  }
})

// TODO：Set/Map方法覆盖
const mutableInstrumentations = {
  add(key) {
    const target = this[RAW_KEY]
    const hadKey = target.has(key)
    const res = target.add(key)
    if (!hadKey) {
      trigger(target, key, TriggerType.ADD)
    }
    return res
  },
  delete(key) {
    const target = this[RAW_KEY]
    const hadKey = target.has(key)
    const res = target.delete(key)
    if (!hadKey) {
      trigger(target, key, TriggerType.DELETE)
    }
    return res
  },
}
// * reactive
export function createReactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      // * 代理对象可以通过‘RAW_KEY’访问原始数据
      if (key === RAW_KEY) return target
      // * 覆盖数组上的查找和修改长度的方法
      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      // * 处理集合类型（Set/Map/WeakSet/WeakMap）
      if (isCollectionType(obj)) {
        // * 访问集合类型的size属性，指定第三个参数receiver为原始类型解决代理对象没有相关内部槽（[[SetData]]）的错误
        if (key === 'size') {
          track(target, ITERATE_KEY)
          return Reflect.get(target, key, target)
        }
        if (mutableInstrumentations.hasOwnProperty(key))
          return mutableInstrumentations[key]
      }
      // * 只有在非只读时才需要建立响应联系
      // !symbol类型的key不进行追踪，避免数组的内部属性如Symbol.iterator等类似symbol属性被追踪
      if (!isReadonly && typeof key !== 'symbol') {
        track(target, key)
      }
      const res = Reflect.get(target, key, receiver)
      // * 如果是浅响应，直接返回
      if (isShallow) return res
      // * 是深响应，递归将返回变成reactive对象，是只读对象，调用readonly包装
      if (typeof res === 'object' && res !== null)
        return isReadonly ? readonly(res) : reactive(res)
      return res
    },
    set(target, key, newVal, receiver) {
      // * 拦截设置操作
      if (isReadonly) {
        console.warn(`属性${key}是只读的`)
        return true
      }
      // * 先获取旧值
      const oldVal = target[key]
      // * 如果属性不存在，则说明是在添加新属性，否则是在修改已有属性
      let type
      if (Array.isArray(target)) {
        // * 数组类型
        type = Number(key) < target.length ? TriggerType.SET : TriggerType.ADD
      } else {
        // * object
        type = Object.prototype.hasOwnProperty.call(target, key)
          ? TriggerType.SET
          : TriggerType.ADD
      }
      newVal = newVal[RAW_KEY] || newVal // * 避免数据污染（将响应式对象设置到原始对象上）
      const res = Reflect.set(target, key, newVal, receiver)
      // * target === receiver.raw说明receiver就是target的代理对象
      // * 解决对象的父级也是响应式数据，并且获取父级对象才有的属性时副作用函数重复执行的问题(父级读取时也被track，trigger时拦截掉父级的)
      // * target会变，receiver不会变，一直是被访问的代理对象
      if (target === receiver[RAW_KEY]) {
        // * 当新值不等于旧值，且双方不全是NaN时才触发响应
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
          trigger(target, key, type, newVal /* 在改变数组长度时使用 */)
        }
      }
      return res
    },
    has(target, key) {
      track(target, key)
      return Reflect.has(target, key)
    },
    ownKeys(target) {
      // * 将副作用函数与ITERATE_KEY相关联
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    deleteProperty(target, key) {
      // * 拦截删除操作
      if (isReadonly) {
        console.warn(`属性${key}是只读的`)
        return true
      }
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const res = Reflect.deleteProperty(target, key)
      if (hadKey && res) trigger(target, key, TriggerType.DELETE) // * 只有当删除的是自身属性并且成功删除时才触发更新
      return res
    },
  })
}

const reactiveMap = new Map()
export function reactive(obj) {
  const existProxy = reactiveMap.get(obj)
  if (existProxy) return existProxy
  const proxy = createReactive(obj)
  reactiveMap.set(obj, proxy)
  return proxy
}

export function shallowReactive(obj) {
  return createReactive(obj, true)
}

export function readonly(obj) {
  return createReactive(obj, false, true) // 深只读
}

export function shallowReadonly(obj) {
  return createReactive(obj, true, true) // 浅只读
}

// *computed
export function computed(getter) {
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

// * watch
export function watch(source, cb, options = {}) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let oldValue, newValue
  // *解决“竞态”问题
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
