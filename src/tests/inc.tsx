// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createElement } from 'react'
import { render } from 'react-dom'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import create, { define, merge, reflect, useAutoEffect } from '../mobz'

// const store = create({
//     count: 0,
//     inc() { this.count++ }
// })

// const store = create<{ count: number, inc: () => void }>(self => ({
//     count: 0,
//     inc() { self().count++ }
// }))

// const useCounter = define(() => (a: number) => ({
//     count: a,
//     inc() { this.count++ }
// }))

// const useCounter = define<{ count: number, inc: () => void }, [a: number]>(self => (a) => ({
//     count: a,
//     inc() { self().count++ }
// }))

//const store = new useCounter(-1)

const store = create<{ count: number, inc: () => void }>((self, set) => ({
    count: 0,
    inc() {
        set({ count: self().count + 1 })
    },
    deep: {
        a: 1
    },
}))

console.log('a', store, { ...store }, merge({}, store), store[reflect])

function Inc() {
    //const store = useCounter(1)
    const count = store(s => s.count)
    const inc = store(s => s.inc)

    useAutoEffect(() => {
        console.log(store.count)
    }, {
        stopSignal: () => new Promise(res => setTimeout(() => {
            console.log('timeout')
            res()
        }, 5000))
    })

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
