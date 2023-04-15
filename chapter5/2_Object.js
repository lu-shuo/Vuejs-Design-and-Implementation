// * 我们经常听到这样的说法：“JavaScript 中一切皆对象。”

// # 什么是对象？
// 根据 ECMAScript 规范，在 JavaScript 中有两种对象，其中一种叫作常规对象（ordinary object），另一种叫作异质对象 （exotic object）
// 这两种对象包含了 JavaScript 世界中的所有对象，任何不属于常规对象的对象都是异质对象。

// * 那么到底什么是常规对象，什么是异质对象呢？这需要我们先了解对象的内部方法和内部槽。
// 在 JavaScript 中，函数其实也是对象。假设给出一个对象 obj，如何区分它是普通对象还是函数呢？
// 实际上，在 JavaScript中，对象的实际语义是由对象的内部方法（internal method）指定的。
// ## 内部方法
// 所谓内部方法，指的是当我们对一个对象进行操作时在引擎内部调用的方法，这些方法对于 JavaScript 使用者来说是不可见的。
// 在 ECMAScript 规范中使用 [[xxx]] 来代表内部方法或内部槽。
// ### 必要的内部方法
// 内部方法                   签名                                                描述
// [[GetPrototypeOf]]       ( ) → Object | Null                                 查明为该对象提供继承属性的对象，null 代表没有继承属性
// [[SetPrototypeOf]]       (Object | Null) → Boolean                           将该对象与提供继承属性的另一个对象相关联。传递 null 表示没有继承属性，返回 true 表示操作成功完成，返回 false 表示操作失败
// [[IsExtensible]]         ( ) → Boolean                                       查明是否允许向该对象添加其他属性
// [[PreventExtensions]]    ( ) → Boolean                                       控制能否向该对象添加新属性。如果操作成功则返回 true，如果操作失败则返回 false
// [[GetOwnProperty]]       (propertyKey) → Undefined | Property Descriptor     返回该对象自身属性的描述符，其键为 propertyKey，如果不存在这样的属性，则返回 undefined
// [[DefineOwnProperty]]    (propertyKey, PropertyDescriptor) → Boolean         创建或更改自己的属性，其键为propertyKey，以具有由PropertyDescriptor 描述的状态。如果该属性已成功创建或更新，则返回true；如果无法创建或更新该属性，则返回 false
// [[HasProperty]]          (propertyKey) → Boolean                             返回一个布尔值，指示该对象是否已经拥有键为 propertyKey 的自己的或继承的属性
// [[Get]]                  (propertyKey, Receiver) → any                       从该对象返回键为 propertyKey 的属性的值。如果必须运行 ECMAScript代码来检索属性值，则在运行代码时使用 Receiver 作为 this 值
// [[Set]]                  (propertyKey, value, Receiver) → Boolean            将键值为 propertyKey 的属性的值设置为 value。如果必须运行ECMAScript 代码来设置属性值，则在运行代码时使用 Receiver 作为this 值。如果成功设置了属性值，则返回 true；如果无法设置，则返回false
// [[Delete]]               (propertyKey) → Boolean                             从该对象中删除属于自身的键为propertyKey 的属性。如果该属性未被删除并且仍然存在，则返回false；如果该属性已被删除或不存在，则返回 true
// [[OwnPropertyKeys]]      ( ) → List of propertyKey                           返回一个 List，其元素都是对象自身的属性键

// 由上面可知，包括 [[Get]] 在内，一个对象必须部署 11 个必要的内部方法。
// 除了上面的11个，还有两个额外的必要内部方法：
// [[Call]]                 (any, a List of any) → any                          将运行的代码与 this 对象关联。由函数调用触发。该内部方法的参数是一个 this 值和参数列表
// [[Construct]]            (a List of any, Object) →Object                     创建一个对象。通过 new 运算符或 super 调用触发。该内部方法的第一个参数是一个 List，该 List 的元素是构造函数调用或 super 调用的参数，第二个参数是最初应用new 运算符的对象。实现该内部方法的对象称为构造函数
// 如果一个对象需要作为函数调用，那么这个对象就必须部署内部方法 [[Call]]。通过这种方式我们就可以区分一个对象是否为函数对象或者普通对象。

// * 内部方法具有多态性：不同的对象可能部署了相同的内部方法，却具有不同的逻辑。
// 例如Proxy对象的[[Get]]方法就和普通对象的[[Get]]方法定义的不同。

// * 了解了内部方法，就可以解释什么是常规对象，什么是异质对象了。满足以下三点要求的对象就是常规对象：
// - 对于表 5-1 列出的内部方法，必须使用 ECMA 规范 10.1.x 节给出的定义实现；
// - 对于内部方法 [[Call]]，必须使用 ECMA 规范 10.2.1 节给出的定义实现；
// - 对于内部方法 [[Construct]]，必须使用 ECMA 规范 10.2.2 节给出的定义实现。
// 而所有不符合这三点要求的对象都是异质对象。例如，由于Proxy 对象的内部方法 [[Get]] 没有使用 ECMA 规范的 10.1.8 节给出的定义实现，所以 Proxy 是一个异质对象。

// # Proxy对象
// 既然 Proxy 也是对象，那么它本身也部署了上述必要的对象内部方法。
// const obj = { foo: 1 }
// const p = new Proxy(obj, {})
// 当我们使用代理对象访问属性时，如果我们没有显示的定义P上的[[Get]]实现，那么引擎就会调用原始对象obj上的[[Get]]来获取属性值，如果在p上重新定义了[[Get]]，则会调用p上的[[Get]]定义，这就体现了内部方法的多态性以及代理透明原则。

// * 由此我们可以明白：创建代理对象时指定的拦截函数，实际上是用来自定义代理对象本身的内部方法和行为的，而不是用来指定被代理对象的内部方法和行为的。

// ## Proxy 对象部署的所有内部方法以及用来自定义内部方法和行为的拦截函数名字3。
// 内部方法                       拦截器函数名称
// [[GetPrototypeOf]]           getPrototypeOf
// [[SetPrototypeOf]]           setPrototypeOf
// [[IsExtensible]]             isExtensible
// [[PreventExtensions]]        preventExtensions
// [[GetOwnProperty]]           getOwnPropertyDescriptor
// [[DefineOwnProperty]]        defineProperty
// [[HasProperty]]              has
// [[Get]]                      get
// [[Set]]                      set
// [[Delete]]                   deleteProperty
// [[OwnPropertyKeys]]          ownKeys
// [[Call]]                     apply
// [[Construct]]                construct

// 当然，[[Call]] 和 [[Construct]] 这两个内部方法只有当被代理的对象是函数和构造函数时才会部署。

// 由上述可知，当我们要拦截删除属性操作时，可以使用deleteProperty 拦截函数实现：
const obj = { foo: 1 }
const p = new Proxy(obj, {
  deleteProperty(target, key) {
    return Reflect.deleteProperty(target, key)
  },
})
// * 需要注意，deleteProperty实现的是代理对象p的内部方法和行为，所以为了删除被代理对象上的属性值，我们需要调用Reflect.deleteProperty(target, key)
