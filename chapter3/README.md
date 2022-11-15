# Vue3 设计思路

Vue 是多个模块构成的有机整体。

# 组成

1. 编译器：将声明式的模板编译为 Vnode
   可在编译时将可变的部分用字段标识，减少渲染期间 diff 的性能开销
2. 渲染器：根据 Vnode 渲染 DOM，根据变化更新 DOM