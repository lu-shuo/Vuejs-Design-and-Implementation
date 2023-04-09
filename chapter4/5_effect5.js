// *解决4.js中产生的残留副作用函数的方法:
// 每次执行副作用函数之前将副作用函数从所有与之关联的依赖集合中删除，执行完毕后会重新建立联系，但在新的联系中不包含遗留的副作用函数

const data = {
  ok: true,
  text: 'hello world',
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

let activeEffect // 用一个全局变量存储被注册的副作用函数
const bucket = new WeakMap()

// *要将副作用函数从关联的依赖中删除，首先要知道哪些依赖集合中包含它
// *所以我们要重新设计副作用函数

const effect = (fn) => {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    fn()
  }

  effectFn.deps = [] // *用来存储与之相关联的依赖

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
  // effects && effects.forEach((fn) => fn()) 删除
  const effectsToRun = new Set(effects)
  effectsToRun.forEach((effectFn) => effectFn()) // 新增：解决Set死循环问题
}

// effect(() => {
//   console.log('effect trigger')
//   document.body.innerText = obj.ok ? obj.text : 'not'
// })

// obj.ok = false

// setTimeout(() => {
//   obj.text = 'hello vue3'
// }, 1000)

// !缺点：无法处理嵌套的副作用函数
const data1 = {
  foo: true,
  bar: true,
}

const obj1 = new Proxy(data1, {
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

let temp1, temp2

// 下面的代码中，effectFn1中嵌套了effectFn2，effectFn1的执行会导致effectFn2的执行
// 此时预想中建立的关系为：foo -> effectFn1, bar -> effectFn2
// 如果我们改变obj1.foo，则会导致effectFn1,effectFn2都重新执行
// 然而结果却是只有effectFn2重新执行了
effect(function effectFn1() {
  console.log('effectFn1 执行')

  effect(function effectFn2() {
    console.log('effectFn2 执行')

    temp2 = obj1.bar
  })

  temp1 = obj1.foo
})

obj1.foo = false

// !这是因为在当前的实现中，activeEffect只有一个，它会被嵌套的内层副作用函数覆盖
