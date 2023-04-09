// *改进effect硬编码的问题
const data = {
  text: 'hello world',
}

const obj = new Proxy(data, {
  get(target, key) {
    // 读取触发副作用收集
    if (activeEffect) {
      bucket.add(activeEffect)
    }
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    bucket.forEach((fn) => fn())
    return true // 返回true代表操作成功
  },
})

const bucket = new Set() // 存储副作用函数的桶

let activeEffect // 用一个全局变量存储被注册的副作用函数

// effect改为注册副作用函数的函数
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

// !缺点
// 1. 没有建立key与副作用的联系
