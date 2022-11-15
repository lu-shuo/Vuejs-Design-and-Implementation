// *改进的响应式
// *树型数据结构 target -> key -> effects

const data = {
  text: 'hello world',
}

const obj = new Proxy(data, {
  get(target, key) {
    if (!activeEffect) return target[key] // 没有带注册副作用，直接return
    let depsMap = bucket.get(target)
    if (!depsMap) {
      bucket.set(target, (depsMap = new Map()))
    }
    let deps = depsMap.get(key)
    if (!deps) {
      depsMap.set(key, (deps = new Set()))
    }
    deps.add(activeEffect)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    const depsMap = bucket.get(target)
    if (!depsMap) return
    const effects = depsMap.get(key)
    effects && effects.forEach((fn) => fn())
  },
})

let activeEffect // 用一个全局变量存储被注册的副作用函数
const bucket = new WeakMap()

const effect = (fn) => {
  activeEffect = fn
  fn()
}

effect(() => {
  document.body.innerText = obj.text
}) // 注册副作用函数

setTimeout(() => {
  obj.text = 'hello vue3'
}, 1000)
