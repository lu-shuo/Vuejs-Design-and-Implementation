// const set = new Set([1])

// set.forEach((item) => {
//   set.delete(item)
//   set.add(item)
//   console.log('遍历中')
// })
// !上面代码会无限循环
// 在调用forEach遍历set集合时，如果这个值已经被访问，但该值被删除并重新添加到集合中，如果此时forEach遍历没有结束，那么该值会被重复访问，从而导致死循环。

// *解决：新建一个Set遍历它
const set = new Set([1])

const newSet = new Set(set)
newSet.forEach((item) => {
  set.delete(1)
  set.add(1)
  console.log('遍历中', set)
})
