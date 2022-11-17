// *computed 与 lazy
import { effect, track, trigger, computed } from './core.js'

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

const sumRes = computed(() => {
  // console.log('computed getter')
  return obj.foo + obj.bar
})

console.log(sumRes.value)

effect(() => {
  console.log(sumRes.value)
})

obj.foo++
