import { effect, ref } from '../reactivity.js'

// * 渲染器是更加宽泛的概念，它包含渲染。渲染器不仅可以用来渲染，还可以用来激活已有的 DOM 元素，这个过程通常发生在同构渲染的情况下
// * 渲染器的内容非常广泛，而用来把 vnode 渲染为真实 DOM 的 render 函数只是其中一部分。
// * 实际上，在 Vue.js 3 中，甚至连创建应用的 createApp 函数也是渲染器的一部分。
const SPECIAL_TYPE = {
  Text: Symbol(), // 文本节点 type
  Comment: Symbol(), // 注释节点 type
  Fragment: Symbol(), // Fragment 虚拟节点，可包含多个根节点
}

/**
 * 渲染器工厂
 * 通过配置项可自定义，实现跨平台
 * @param {*} options
 * createElement
 * insert
 * setElementText
 * patchProps
 * @returns
 */
function createRenderer(options) {
  // * 通过 options 得到操作 DOM 的 API
  const {
    createElement,
    insert,
    setElementText,
    createText,
    setText,
    createComment,
    setComment,
    patchProps,
  } = options

  /**
   * 挂载节点
   * @param {*} vnode
   * @param {HTMLElement} container
   * @param {*} anchor
   */
  function mountElement(vnode, container, anchor = null) {
    // 将el与vnode.el建立联系，用于卸载操作
    const el = (vnode.el = createElement(vnode.type))

    if (typeof vnode.children === 'string') {
      // 如果 children 是字符串，调用setElementText设置文本节点
      setElementText(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      // 如果 children 是数组，则遍历每一个子节点，并调用 patch 函数挂载它
      vnode.children.forEach((child) => {
        patch(null, child, el)
      })
    }

    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key])
      }
    }

    insert(el, container, anchor)
  }

  /**
   * 新旧节点打补丁
   * @param {*} n1 旧节点
   * @param {*} n2 新节点
   * @param {HTMLElement} container
   * @param {HTMLElement} anchor
   */
  function patch(n1, n2, container, anchor = null) {
    // * 1.如果 n1 不存在，意味着挂载，则调用 mountElement 函数完成挂载
    if (!n1) {
      mountElement(n2, container, anchor)
      return
    }
    // * 2.n1 存在则对比 n1 和 n2 的类型
    if (n1 && n1.type !== n2.type) {
      // 如果新旧 vnode 的类型不同，则直接将旧 vnode 卸载
      unmount(n1)
      n1 = null
    }
    // * n1,n2类型相同
    const { type } = n2
    // * 如果 n2.type 的值是字符串类型，则它描述的是普通标签元素
    if (typeof type === 'string') {
      if (!n1) {
        mountElement(n2, container)
      } else {
        // 更新
        patchElement(n1, n2)
      }
    } else if (type === SPECIAL_TYPE.Text) {
      // * 文本节点
      if (!n1) {
        const el = createText(n2.children)
        insert(el, container)
      } else {
        const el = (n2.el = n1.el)
        if (n2.children !== n1.children) {
          setText(el, n2.children)
        }
      }
    } else if (type === SPECIAL_TYPE.Comment) {
      // * 注释节点
      if (!n1) {
        const el = createComment(n2.children)
        insert(el, container)
      } else {
        const el = (n2.el = n1.el)
        if (n2.children !== n1.children) {
          setComment(el, n2.children)
        }
      }
    } else if (type === SPECIAL_TYPE.Fragment) {
      if (!n1) {
        n2.children.forEach((c) => patch(null, c, container))
      } else {
        patchChildren(n1, n2, container)
      }
    } else if (typeof type === 'object') {
      // * 如果 n2.type 的值的类型是对象，则它描述的是组件
      if (!n1) {
        // mountComponent(n2, container)
      } else {
        // patchComponent(n1, n2, container)
      }
    } else if (typeof type === 'xxx') {
      // * 处理其它类型的vnode
    }
  }

  /**
   * 更新节点
   * @param {*} n1 旧节点
   * @param {*} n2 新节点
   */
  function patchElement(n1, n2) {
    const el = (n2.el = n1.el)
    const oldProps = n1.props
    const newProps = n2.props
    // * 1.更新 props
    for (const key in newProps) {
      if (oldProps[key] !== newProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key])
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null)
      }
    }
    // * 2.更新children
    patchChildren(n1, n2, el)
  }

  /**
   * 更新子节点
   * @param {*} n1 旧子节点
   * @param {*} n2 新子节点
   * @param {HTMLElement} container
   */
  // 子节点只可能有三种情况：
  // 没有子节点，此时 vnode.children 的值为 null。
  // 具有文本子节点，此时 vnode.children 的值为字符串，代表文本的内容。
  // 其他情况，无论是单个元素子节点，还是多个子节点（可能是文本和元素的混合），都可以用数组来表示。
  function patchChildren(n1, n2, container) {
    if (typeof n2.children === 'string') {
      // 旧子节点的类型有三种可能：没有子节点、文本子节点以及一组子节点
      // 只有当旧子节点为一组子节点时，才需要逐个卸载，其他情况下什么都不需要
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c))
      }
      setElementText(container, n2.children)
    } else if (Array.isArray(n2.children)) {
      // # 简单Diff算法实现
      // lenDiff(n1, n2, container)
      keyDiff(n1, n2, container)
    } else {
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c))
      } else if (typeof n1.children === 'string') {
        setElementText(container, '')
      }
    }
  }

  // # 简单Diff算法实现
  // * 不同数量的子节点 patch
  function lenDiff(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children
    const oldLen = oldChildren.length
    const newLen = newChildren.length
    // * 1.遍历长度较短的一方
    const commonLength = Math.min(oldLen, newLen)
    for (let i = 0; i < commonLength; i++) {
      patch(oldChildren[i], newChildren[i], container)
    }
    // * 2.如果newLen > oldLen，则有新的子节点需要挂载
    if (newLen > oldLen) {
      for (let i = commonLength; i < newLen; i++) {
        patch(null, newChildren[i], container)
      }
    } else if (oldLen > newLen) {
      // * 3.如果newLen < oldLen，则有旧的子节点需要卸载
      for (let i = commonLength; i < oldLen; i++) {
        unmount(oldChildren[i])
      }
    }
  }

  // * 通过 key 和 vnode.type 比较 实现 DOM 元素的复用。
  /**
   *
   * @param {*} n1
   * @param {*} n2
   * @param {HTMLElement} container
   */
  function keyDiff(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children
    // * 1.移动已存在的节点
    // 存储寻找过程中遇到的最大索引值
    let lastIndex = 0
    for (let i = 0; i < newChildren.length; i++) {
      const newVNode = newChildren[i]
      let find = false
      for (let j = 0; j < oldChildren.length; j++) {
        const oldVNode = oldChildren[j]
        if (oldVNode.key === newVNode.key) {
          find = true
          patch(oldVNode, newVNode, container)
          if (j < lastIndex) {
            // 如果当前找到的节点在oldChildren中的索引小于最大索引值，说明该节点对应的真实DOM需要移动
            // 如何移动？其实就是移动当前vnode对应的真实DOM元素，它被保存在vnode.el属性中，详见patchElement函数
            const prevVNode = newChildren[i - 1]
            // 如果prevVNode不存在，则说明当前节点是第一个，不需要移动
            if (prevVNode) {
              const anchor = prevVNode.el.nextSibling
              insert(newVNode.el, container, anchor)
            }
          } else {
            lastIndex = j
          }
          break
        }
      }
      // * 2.没有找到已存在的节点，则为新增节点
      if (!find) {
        const prevVNode = newChildren[i - 1]
        let anchor = null
        if (!prevVNode) {
          anchor = container.firstChild
        } else {
          anchor = prevVNode.el.nextSibling
        }
        patch(null, newVNode, container, anchor)
      }
    }
    // * 3.卸载被移除的节点
    for (let i = 0; i < oldChildren.length; i++) {
      const oldVNode = oldChildren[i]
      const has = newChildren.find((vnode) => vnode.key === oldVNode.key)
      if (!has) {
        unmount(oldVNode)
      }
    }
  }

  /**
   * 卸载
   * @param {*} vnode
   */
  function unmount(vnode) {
    // 在 unmount 函数内，我们有机会调用绑定在 DOM 元素上的指令钩子函数，例如 beforeUnmount、unmounted 等。
    // 当 unmount 函数执行时，我们有机会检测虚拟节点 vnode 的类型。
    // 如果该虚拟节点描述的是组件，则我们也有机会调用组件相关的生命周期函数。
    if (vnode.type === SPECIAL_TYPE.Fragment) {
      vnode.children.forEach((c) => unmount(c))
      return
    }
    const parent = vnode.el.parentNode
    if (parent) parent.removeChild(vnode.el)
  }

  function render(vnode, container) {
    if (vnode) {
      // * 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数，进行打补丁
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        // * 旧 vnode 存在，且新 vnode 不存在，卸载旧 vnode
        unmount(container._vnode)
      }
    }
    // * 把 vnode 存储到 container._vnode 下，即后续渲染中的旧 vnode
    container._vnode = vnode
  }

  function hydrate(vnode, container) {}

  return {
    render,
    hydrate,
  }
}

// 浏览器端简要实现测试

function shouldSetAsProps(el, key) {
  // “只读属性”特殊处理
  // 实际上，不仅仅是 <input/> 标签，所有表单元素都具有 form 属性，它们都应该作为 HTML Attributes 被设置。
  if (key === 'form' && el.tagName === 'INPUT') return false
  return key in el
}

// class为字符串，数组，对象
function normalizeClass(val) {
  let res
  if (typeof val === 'string') {
    res = val
  } else if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      const normalized = normalizeClass(val[i])
      if (normalized) {
        res += normalized + ' '
      }
    }
  } else if (val !== null && typeof val === 'object') {
    for (const key in val) {
      if (val[key]) {
        res += key + ' '
      }
    }
  }
  return res.trim()
}

const renderer = createRenderer({
  createElement(tag) {
    return document.createElement(tag)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    // var insertedNode = parentNode.insertBefore(newVNode, referenceNode);
    // insertedNode 被插入节点 (newVNode)
    // parentNode 新插入节点的父节点
    // newVNode 用于插入的节点
    // referenceNode newVNode 将要插在这个节点之前。必须，如果为null则 newVNode 将被插入到子节点的末尾
    parent.insertBefore(el, anchor)
  },
  createText(text) {
    return document.createTextNode(text)
  },
  setText(el, text) {
    el.nodeValue = text // Node 的 nodeValue 属性返回或设置当前节点的值。对于文档节点来说，nodeValue返回null. 对于 text, comment，和 CDATA 节点来说，nodeValue 返回该节点的文本内容. 对于 attribute 节点来说，返回该属性的属性值。
  },
  createComment(text) {
    return document.createComment(text)
  },
  setComment(el, text) {
    el.nodeValue = text // Node 的 nodeValue 属性返回或设置当前节点的值。对于文档节点来说，nodeValue返回null. 对于 text, comment，和 CDATA 节点来说，nodeValue 返回该节点的文本内容. 对于 attribute 节点来说，返回该属性的属性值。
  },
  patchProps(el, key, prevValue, nextValue) {
    if (/^on/.test(key)) {
      // 定义 el._vei 为一个对象，存储事件名称到事件处理函数的映射
      const invokers = el._vei || (el._vei = {})
      // 根据事件名称获取 invoker
      let invoker = invokers[key]
      const name = key.slice(2).toLowerCase()
      if (nextValue) {
        if (!invoker) {
          // 如果没有 invoker，则将一个伪造的 invoker 缓存到 el._vei 中
          // vei 是 vue event invoker 的首字母缩写
          invoker = el._vei[key] = (e) => {
            // 如果事件发生的时间早于事件处理函数绑定的时间，则不执行事件处理函数
            if (e.timeStamp < invoker.attached) return
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach((fn) => fn(e))
            } else {
              invoker.value(e)
            }
          }
          // 将真正的事件处理函数赋值给 invoker.value
          invoker.value = nextValue
          // 添加 invoker.attached 属性，存储事件处理函数被绑定的时间
          invoker.attached = performance.now()
          // 绑定 invoker 作为事件处理函数
          el.addEventListener(name, invoker)
        } else {
          // 如果 invoker 存在，意味着更新，并且只需要更新 invoker.value的值即可
          invoker.value = nextValue
        }
      } else if (invoker) {
        // 新的事件绑定函数不存在，且之前绑定的 invoker 存在，则移除绑定
        el.removeEventListener(name, invoker)
      }
    } else if (key === 'class') {
      // el.className、setAttribute 和 el.classList三者中className性能最优
      el.className = normalizeClass(nextValue) || ''
    } else if (shouldSetAsProps(el, key)) {
      // 用 in 操作符判断 key 是否存在对应的 DOM Properties
      const type = typeof el[key]
      if (type === 'boolean' && nextValue === '') {
        el[key] = true
      } else {
        el[key] = nextValue
      }
    } else {
      // 如果要设置的属性没有对应的 DOM Properties或者是只读属性，则使用setAttribute 函数设置属性
      el.setAttribute(key, vnode.props[key])
    }
  },
})

// # test

const oldVnode = {
  type: 'div',
  children: [
    {
      type: 'p',
      children: '1',
      key: 1,
    },
    {
      type: 'p',
      children: '2',
      key: 2,
    },
    {
      type: 'p',
      children: 'hello',
      key: 3,
    },
  ],
}

const newVnode = {
  type: 'div',
  children: [
    {
      type: 'p',
      children: '2',
      key: 2,
    },
    {
      type: 'p',
      children: '1',
      key: 1,
    },
    {
      type: 'p',
      children: 'new',
      key: 4,
    },
  ],
}

// 首次挂载
renderer.render(oldVnode, document.querySelector('#app'))

setTimeout(() => {
  // 1秒钟之后更新
  renderer.render(newVnode, document.querySelector('#app'))
}, 1000)
