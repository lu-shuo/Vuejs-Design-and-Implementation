// * 渲染器是更加宽泛的概念，它包含渲染。渲染器不仅可以用来渲染，还可以用来激活已有的 DOM 元素，这个过程通常发生在同构渲染的情况下
// * 渲染器的内容非常广泛，而用来把 vnode 渲染为真实 DOM 的 render 函数只是其中一部分。
// * 实际上，在 Vue.js 3 中，甚至连创建应用的 createApp 函数也是渲染器的一部分。

/**
 * 渲染器工厂
 * 通过配置项可自定义，实现跨平台
 * @param {*} options
 * createElement
 * insert
 * setElementText
 * @returns
 */
function createRenderer(options) {
  // * 通过 options 得到操作 DOM 的 API
  const { createElement, insert, setElementText } = options

  /**
   * 挂载节点
   * @param {*} vnode
   * @param {*} container
   */
  function mountElement(vnode, container) {
    const el = createElement(vnode.type)
    if (typeof vnode.children === 'string') {
      // * 1.如果 children 是字符串，调用setElementText设置文本节点
      setElementText(el, vnode.children)
    } else if (Array.isArray(vnode.children)) {
      // * 2.如果 children 是数组，则遍历每一个子节点，并调用 patch 函数挂载它
      vnode.children.forEach((child) => {
        patch(null, child, el)
      })
    }
    insert(el, container)
  }

  /**
   * 打补丁函数
   * @param {*} n1 旧节点
   * @param {*} n2 新节点
   * @param {*} container
   */
  function patch(n1, n2, container) {
    if (!n1) {
      // * 1.如果 n1 不存在，意味着挂载，则调用 mountElement 函数完成挂载
      mountElement(n2, container)
    } else {
      // * 2.n1 存在，打补丁
    }
  }

  function render(vnode, container) {
    if (vnode) {
      // * 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数，进行打补丁
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        // * 旧 vnode 存在，且新 vnode 不存在，说明是卸载（unmount）操作，只需要将 container 内的 DOM 清空即可
        container.innerHTML = ''
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

// 测试
// 虚拟DOM树
const vnode = {
  type: 'div',
  props: {
    id: 'foo',
  },
  children: [
    {
      type: 'p',
      children: 'hello',
    },
  ],
}

const renderer = createRenderer({
  createElement(tag) {
    console.log(`创建元素 ${tag}`)
    return { tag }
  },
  setElementText(el, text) {
    console.log(`设置 ${JSON.stringify(el)} 的文本内容：${text}`)
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    console.log(`将 ${JSON.stringify(el)} 添加到${JSON.stringify(parent)} 下`)
    parent.children = el
  },
})

const container = { type: 'root' }

renderer.render(vnode, container)
