// *可以定义一个effect 栈 来解决5中的嵌套副作用问题

const data = {
  foo: true,
  bar: true,
  num: 0,
}

const obj = new Proxy(data, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    trigger(target, key)
  },
})

const bucket = new WeakMap()

let activeEffect

const effectStack = []

const effect = (fn) => {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }

  effectFn.deps = []

  effectFn()
}

// 每次执行前清除所有与之关联的依赖
function cleanup(effectFn) {
  effectFn.deps.forEach((deps) => {
    deps.delete(effectFn)
  })

  effectFn.deps.length = 0 // 重置deps
}

// 跟踪收集依赖的部分可以封装为track函数
function track(target, key) {
  if (!activeEffect) return // 没有带注册副作用，直接return
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
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  const effectsToRun = new Set()
  // *如果trigger触发的副作用函数与当前正在执行的副作用函数相同，则不触发执行。避免++死循环
  effects &&
    effects.forEach((effectFn) => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  effectsToRun.forEach((effectFn) => effectFn()) // 新增：解决Set死循环问题
}

// let temp1, temp2

// effect(function effectFn1() {
//   console.log('effectFn1 执行')

//   effect(function effectFn2() {
//     console.log('effectFn2 执行')

//     temp2 = obj.bar
//   })

//   temp1 = obj.foo
// })

// obj.foo = false
// obj.bar = false

effect(() => {
  console.log('++ effectFn 执行')
  obj.num++
})

obj.num++
