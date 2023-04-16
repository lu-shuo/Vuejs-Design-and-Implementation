# chapter5 非原始值的响应式方案

- [x] 1. 理解 Proxy 和 Reflect
- [x] 2. JavaScript 对象与 Proxy 的工作原理
- [x] 3. 如何代理 Object
- [x] 4. 合理的触发响应
- [x] 5. 浅响应与深响应
- [x] 6. 只读和浅只读
- [x] 7. 代理数组
  - [x] 7.1 数组的索引与 length
  - [x] 7.2 遍历数组
  - [x] 7.3 数组的查找方法
  - [x] 7.4 隐式修改数组长度的原型方法
- [ ] 8. 代理 Set 和 Map
  - [ ] 8.1 如何代理 Set 和 Map
  - [ ] 8.2 建立响应联系
  - [ ] 8.3 避免污染原始数据
  - [ ] 8.4 处理 forEach
  - [ ] 8.5 迭代器方法
  - [ ] 8.6 values 和 keys 方法
- [ ] 9. 总结

# 参考

本章会引用 [ECMA-262](https://www.ecma-international.org/publications-and-standards/standards/ecma-262/) 规范，如不作特殊说明，皆指该规范的 2021 版本。
