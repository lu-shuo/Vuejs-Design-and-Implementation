// * 1.引擎执行任务时永远不会进行渲染（render）。如果任务执行需要很长一段时间也没关系。仅在任务完成后才会绘制对 DOM 的更改。
// * 2.如果一项任务执行花费的时间过长，浏览器将无法执行其他任务，例如处理用户事件。因此，在一定时间后，浏览器会抛出一个如“页面未响应”之类的警报，建议你终止这个任务。这种情况常发生在有大量复杂的计算或导致死循环的程序错误时。
// function count() {
//   for (let i = 0; i < 1e6; i++) {
//     i++
//     progress.innerHTML = i // 直到执行完才会更新dom，所以我们只能看到i最后的值
//   }
// }

// 改进 可显示进度
// let i = 0

// function count() {
//   // 做繁重的任务的一部分 (*)
//   do {
//     i++
//     progress.innerHTML = i
//   } while (i % 1e3 != 0)

//   if (i < 1e7) {
//     setTimeout(count)
//   }
// }

// count()

// * 每个宏任务之后，引擎会立即执行微任务队列中的所有任务，然后再执行其他的宏任务，或渲染，或进行其他任何操作。
// setTimeout(() => alert('timeout'))

// Promise.resolve().then(() => alert('promise'))

// alert('code')
// code 首先显示，因为它是常规的同步调用。
// promise 第二个出现，因为 then 会通过微任务队列，并在当前代码之后执行。
// timeout 最后显示，因为它是一个宏任务。

// * 微任务会在执行任何其他事件处理，或渲染，或执行任何其他宏任务之前完成。
// * 这很重要，因为它确保了微任务之间的应用程序环境基本相同（没有鼠标坐标更改，没有新的网络数据等）。

// 如果我们想要异步执行（在当前代码之后）一个函数，但是要在更改被渲染或新事件被处理之前执行，那么我们可以使用 queueMicrotask 来对其进行安排（schedule）。

// 这是一个与前面那个例子类似的，带有“计数进度条”的示例，但是它使用了 queueMicrotask 而不是 setTimeout。你可以看到它在最后才渲染。就像写的是同步代码一样：
// let i = 0

// function count() {
//   做繁重的任务的一部分 (*)
//   do {
//     i++
//     progress.innerHTML = i
//   } while (i % 1e3 != 0)

//   if (i < 1e6) {
//     queueMicrotask(count)
//   }
// }

// count()

// * 总结
// 从 宏任务 队列（例如 “script”）中出队（dequeue）并执行最早的任务。
// 执行所有 微任务：
//    当微任务队列非空时：
//        出队（dequeue）并执行最早的微任务。
// 如果有变更，则将变更渲染出来。
// 如果宏任务队列为空，则休眠直到出现宏任务。
// 转到步骤 1。

// *测试
console.log(1)

setTimeout(() => console.log(2))

Promise.resolve()
  .then(() => console.log(3))
  .finally(() => console.log('second microtask'))

Promise.resolve().then(() => setTimeout(() => console.log(4)))

Promise.resolve().then(() => console.log(5))

setTimeout(() => console.log(6))

console.log(7)
// 1, 7, 3, 5, 2, 6, 4
