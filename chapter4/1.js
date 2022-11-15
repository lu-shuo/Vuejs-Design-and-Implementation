// *最初级的响应式
const data = {
  text: 'hello world',
}

const obj = new Proxy(data, {
  get(target, key) {
    // 读取触发副作用收集
    bucket.add(effect)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    bucket.forEach((fn) => fn())
    return true // 返回true代表操作成功
  },
})

const bucket = new Set() // 存储副作用函数的桶

// 副作用函数
const effect = () => {
  document.body.innerText = obj.text
}

effect() // 执行effect触发读取

setTimeout(() => {
  obj.text = 'hello vue3'
}, 1000)

// !缺点
// 1. 没有建立key与副作用的联系
// 2. 副作用函数名称硬编码，不可修改
