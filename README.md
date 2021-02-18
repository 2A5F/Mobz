# Mobz
 
zustand style mobx api

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
    inc() { this.count++ }
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

    const inc = store(s => s.inc) // first level will auto bind this

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


function Inc() {
    const store = useCounter() // new a local store
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
