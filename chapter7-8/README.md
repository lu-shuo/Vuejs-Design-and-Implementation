# 渲染器

- [x] chapter7. 渲染器设计
- [x] chapter8. 挂载与更新

## HTML Attributes 与 DOM Properties

```html
<input id="my-input" type="text" value="foo" />
```

### HTML Attributes

HTML Attributes 指的就是定义在 HTML 标签上的属性，这里指的就是 id="my-input"、type="text" 和 value="foo"。

### DOM Properties

当浏览器解析这段 HTML 代码后，会创建一个与之相符的 DOM 元素对象，我们可以通过 JavaScript 代码来读取该 DOM 对象：

```javascript
const el = document.querySelector('#my-input')
```

DOM 对象 el 的属性即为 DOM Properties。

> HTML Attributes 与 DOM Properties 之间的关系很复杂，并不是一一对应，但其实我们只需要记住一个核心原则即可：HTML Attributes 的作用是设置与之对应的 DOM Properties 的初始值。
