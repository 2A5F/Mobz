# Mobz

[![NPM](https://img.shields.io/npm/v/mobz)](https://www.npmjs.com/package/mobz)
![MIT](https://img.shields.io/github/license/2A5F/Mobz)

[zustand](https://github.com/pmndrs/zustand) style [mobx](https://github.com/mobxjs/mobx) api

## Use

Make sure you depend on react and mobx

```
npm i -S react mobx mobz
```

#### Global Store

```tsx
import create from 'mobz'


const store = create({
    count: 0,
    inc() { this.count++ }  // first level will auto bind this
})

// or

const store = create<{ count: number, inc: () => void }>(self => ({
    count: 0,
    inc() { self().count++ }
}))


function Inc() {
    const count = store(s => s.count) // computed and auto rerender

    // or

    const count = store.count // with out auto rerender， you need observer()

    const inc = store(s => s.inc)

    return <div>
        <div>{count}</div>
        <button onClick={inc}>Inc</button>
    </div>
}

document.addEventListener('DOMContentLoaded', () => {
    render(<div id='app'>
        <Inc></Inc>
    </div>, document.querySelector('#app'))
})
```

#### Local Store

```tsx
import { define } from 'mobz'


const useCounter = define(() => ({
    count: 0,
    inc() { this.count++ }
}))

// or

const useCounter = define<{ count: number, inc: () => void }>(self => ({
    count: 0,
    inc() { self().count++ }
}))

//or 

const useCounter = define(() => (a: number) => ({
    count: a,
    inc() { this.count++ }
}))

// or

const useCounter = define<{ count: number, inc: () => void }, [a: number]>(self => (a) => ({
    count: a,
    inc() { self().count++ }
}))


function Inc() {
    const store = useCounter() // new a local store

    // or

    const store = useCounter(1)


    const count = store(s => s.count)
    const inc = store(s => s.inc)

    return <div>
        <div>{count}</div>
        <button onClick={inc}>Inc</button>
    </div>
}

document.addEventListener('DOMContentLoaded', () => {
    render(<div id='app'>
        <Inc></Inc>
    </div>, document.querySelector('#app'))
})
```

## Hooks

hook version of mobx basic api

- `useObservable(v: () => T, options?)`  
   == `useState(() => observable(v(), options))[0]`  
   suggest `observer()`  

- `useBox(v: T | () => T, options?): IObservableValue<T>`  
   == `useState(() => observable.box(v, options))`  

- `useBoxState(v: T | () => T, options?): [T, (v: T) => void]`  
   need `observer()`  

- `useComputed(getter: () => T, options?) : T`  
   need `observer()`  

- `useComputedRaw(getter: () => T, options?) : IComputedValue<T>`  
   == `useState(() => computed(getter, options))[0]`  

- `useAutoEffect(effect: () => void, options?)`  
   == `useEffect(() => autorun(effect, options), [])`  
   auto rerun

- `useReaction(data: () => T, effect: (next: T, now: T) => void, options?)`  
  == `useEffect(() => reaction(data, effect, options), [])`  

- `useAutoUpdate(effect: { get(): any } | () => void, options?)`  
  auto rerender
