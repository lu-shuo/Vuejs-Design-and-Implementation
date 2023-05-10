import { reactive } from '../reactivity'

export function ref(val) {
  const wrapper = {
    value: val,
  }
  // * 定义一个不可枚举属性__v_isRef标志对象是原始值的包裹对象还是非原始值的响应式数据
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true,
  })

  return reactive(wrapper)
}

// * 解决...运算符响应式丢失的问题
export function toRef(reactiveObj, key) {
  const wrapper = {
    get value() {
      return reactiveObj[key]
    },
    set value(val) {
      reactiveObj[key] = val
    },
  }

  Object.defineProperties(wrapper, '__v_isRef', {
    value: true,
  })

  return wrapper
}

export function toRefs(reactiveObj) {
  const ret = {}

  for (const key in reactiveObj) {
    ret[key] = toRef(reactiveObj, key)
  }

  return ret
}

// * 自动解包，setup return中内部调用此方法，故而在模板中可以直接使用
export function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver)
      return value.__v_isRef ? value.value : value
    },
    set(target, key, newValue, receiver) {
      const value = target[key]
      if (value.__v_isRef) {
        value.value = newValue
        return true
      }
      return Reflect.set(target, key, newValue, receiver)
    },
  })
}
