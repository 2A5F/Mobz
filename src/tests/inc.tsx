import React from 'react'
import { render } from 'react-dom'
import create, { define } from '../mobz'

// const store = create({
//     count: 0,
//     inc() { this.count++ }
// })

const store = create<{ count: number, inc: () => void }>(self => ({
    count: 0,
    inc() { self().count++ }
}))

// const useCounter = define(() => ({
//     count: 0,
//     inc() { this.count++ }
// }))

// const useCounter = define<{ count: number, inc: () => void }>(self => ({
//     count: 0,
//     inc() { self().count++ }
// }))

function Inc() {
    //const store = useCounter()
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
