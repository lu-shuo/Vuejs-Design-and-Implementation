// *将3.js中的代码进行抽离封装
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

const effect = (fn) => {
  activeEffect = fn
  fn()
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
}

// 触发副作用函数的部分封装为trigger
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  effects && effects.forEach((fn) => fn())
}

// !缺点：
// 分支切换时会产生遗留的副作用函数
effect(() => {
  console.log('effect trigger')
  document.body.innerText = obj.ok ? obj.text : 'not'
})
// obj.ok为true，这时候执行副作用函数时副作用函数被obj.ok, obj.text所收集
// 如果我们把obj.ok改为false，这时候永远不会取到obj.text，但当我们改变obj.text的值时，副作用函数仍被执行
obj.ok = false

setTimeout(() => {
  obj.text = 'hello vue3'
}, 1000)
