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
      // # 双端Diff算法实现
      patchKeyedChildren(n1, n2, container)
    } else {
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c))
      } else if (typeof n1.children === 'string') {
        setElementText(container, '')
      }
    }
  }

  /**
   * 快速Diff算法
   * @param {*} n1
   * @param {*} n2
   * @param {HTMLElement} container
   */
  function patchKeyedChildren(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children

    // * 1.预处理
    // 更新相同的前置节点
    let j = 0
    let oldVNode = oldChildren[j]
    let newVNode = newChildren[j]
    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container)
      j++
      oldVNode = oldChildren[j]
      newVNode = newChildren[j]
    }

    // 更新相同的后置节点
    let oldEnd = oldChildren.length - 1
    let newEnd = newChildren.length - 1
    oldVNode = oldChildren[oldEnd]
    newVNode = newChildren[newEnd]
    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container)
      oldEnd--
      newEnd--
      oldVNode = oldChildren[oldEnd]
      newVNode = newChildren[newEnd]
    }
    // 处理新增节点
    if (oldEnd < j && newEnd >= j) {
      const anchorIndex = newEnd + 1
      const anchor =
        anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
      while (j <= newEnd) {
        patch(null, newChildren[j++], container, anchor)
      }
    } else if (j > newEnd && j <= oldEnd) {
      // 处理卸载节点
      while (j <= oldEnd) {
        unmount(oldChildren[j++])
      }
    } else {
      // * 2.处理预处理之后剩余的节点
      // 构建一个source数组，用来存储新的一组子节点中剩余的未被处理的节点在旧的一组子节点中对应的位置索引
      const count = newEnd - j + 1
      const sources = new Array(count)
      sources.fill(-1)

      let oldStart = j
      let newStart = j
      // 标识是否需要DOM移动操作
      let moved = false
      // 记录当前的最大索引值（用来判断是否需要移动节点对应的DOM元素，原理类似简单Diff算法）
      let pos = 0
      // 构建索引表：存储新的一组子节点中key值和索引的对应关系
      const keyIndex = {}
      for (let i = newStart; i <= newEnd; i++) {
        keyIndex[newChildren[i].key] = i
      }
      // patched用于标识已经更新过的节点数量，它的值应该小于等于需要更新的节点数量
      let patched = 0
      // 遍历旧的一组子节点中剩余未处理的节点
      for (let i = oldStart; i <= oldEnd; i++) {
        oldVNode = oldChildren[i]
        if (patched <= count) {
          // 通过索引表找到新的一组子节点中与旧节点key相同的位置索引
          const k = keyIndex[oldVNode.key]
          if (typeof k !== 'undefined') {
            newVNode = newChildren[k]
            patch(oldVNode, newVNode, container)
            patched++
            // 填充source数组
            sources[k - newStart] = i
            if (k < pos) {
              moved = true
            } else {
              pos = k
            }
          } else {
            unmount(oldVNode)
          }
        } else {
          // 卸载多余的节点
          unmount(oldVNode)
        }
      }

      // moved为真，需要进行DOM移动操作
      if (moved) {
        const seq = getSequence(sources)

        let s = seq.length - 1

        let i = count - 1

        for (i; i >= 0; i--) {
          if (sources[i] === -1) {
            // 说明为全新的节点，需要挂载
            const pos = i + newStart
            const newVNode = newChildren[pos]
            const nextPos = pos + 1
            const anchor =
              nextPos < newChildren.length ? newChildren[nextPos].el : null
            patch(null, newVNode, container, anchor)
          } else if (i !== seq[s]) {
            // 需要移动
            const pos = i + newStart
            const newVNode = newChildren[pos]
            const nextPos = pos + 1
            const anchor =
              nextPos < newChildren.length ? newChildren[nextPos].el : null
            insert(newVNode.el, container, anchor)
          } else {
            // 不需要移动
            s--
          }
        }
      }
    }
  }

  /**
   * 求序列的最长递增子序列
   * @param {Array} arr
   * @returns
   */
  function getSequence(arr) {
    const p = arr.slice()
    const result = [0]
    let i, j, u, v, c
    const len = arr.length
    for (i = 0; i < len; i++) {
      const arrI = arr[i]
      if (arrI !== 0) {
        j = result[result.length - 1]
        if (arr[j] < arrI) {
          p[i] = j
          result.push(i)
          continue
        }
        u = 0
        v = result.length - 1
        while (u < v) {
          c = (u + v) >> 1
          if (arr[result[c]] < arrI) {
            u = c + 1
          } else {
            v = c
          }
        }
        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1]
          }
          result[u] = i
        }
      }
    }
    u = result.length
    v = result[u - 1]
    while (u-- > 0) {
      result[u] = v
      v = p[v]
    }
    return result
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

const oldVNode = {
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
      children: '3',
      key: 3,
    },
    {
      type: 'p',
      children: '4',
      key: 4,
    },
    {
      type: 'p',
      children: '6',
      key: 6,
    },
    {
      type: 'p',
      children: '5',
      key: 5,
    },
  ],
}

const newVNode = {
  type: 'div',
  children: [
    {
      type: 'p',
      children: '1',
      key: 1,
    },
    {
      type: 'p',
      children: '3',
      key: 3,
    },
    {
      type: 'p',
      children: '4',
      key: 4,
    },
    {
      type: 'p',
      children: '2',
      key: 2,
    },
    {
      type: 'p',
      children: '7',
      key: 7,
    },
    {
      type: 'p',
      children: '5',
      key: 5,
    },
  ],
}

// 首次挂载
renderer.render(oldVNode, document.querySelector('#app'))

setTimeout(() => {
  // 1秒钟之后更新
  renderer.render(newVNode, document.querySelector('#app'))
}, 1000)
