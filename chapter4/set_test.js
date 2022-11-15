// const set = new Set([1])

// set.forEach((item) => {
//   set.delete(1)
//   set.add(1)
//   console.log('遍历中')
// })
// !上面代码会无限循环

// *解决：新建一个Set遍历它
const set = new Set([1])

const newSet = new Set(set)
newSet.forEach((item) => {
  set.delete(1)
  set.add(1)
  console.log('遍历中', set)
})
