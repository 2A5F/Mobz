(function (React, reactDom, mobx) {
    'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

    function useComputedRaw(getter, options) {
        return React.useState(() => mobx.computed(getter, options))[0];
    }
    function useAutoEffect(effect, options) {
        React.useEffect(() => mobx.autorun(effect, options), []);
    }
    function useAutoUpdate(o, options) {
        const first = React.useRef(true);
        const [, update] = React.useReducer((c) => c + 1, 0);
        useAutoEffect(() => {
            typeof o === 'function' ? o() : o.get();
            if (first.current) {
                first.current = false;
                return;
            }
            update();
        }, options);
    }
    function useStore(store, selector, options) {
        const c = useComputedRaw(() => selector(store));
        if (options?.autoUpdate !== false)
            useAutoUpdate(c);
        return c.get();
    }
    class MobzAction {
        constructor(fn) {
            this.fn = fn;
            this.invoke = ((...args) => this.fn(...args)).bind(this);
        }
    }
    function buildActions(obj) {
        const actions = [];
        for (const key in obj) {
            const i = obj[key];
            if (typeof i === 'function') {
                const a = new MobzAction(i);
                actions.push(a);
                obj[key] = a.invoke;
            }
        }
        return actions;
    }
    function bindActions(obj, actions) {
        for (const action of actions) {
            action.fn = action.fn.bind(obj);
        }
    }
    function create(obj) {
        const self = () => store;
        if (typeof obj === 'function')
            obj = obj(self);
        const actions = buildActions(obj);
        const store = mobx.observable(obj);
        bindActions(store, actions);
        return new Proxy(useStore, {
            apply(target, thisArg, argumentsList) {
                return Reflect.apply(target, thisArg, [store, ...argumentsList]);
            },
            construct(target, argumentsList) {
                return Reflect.construct(target, [store, ...argumentsList]);
            },
            has(_target, prop) {
                return Reflect.has(store, prop);
            },
            get(_target, property, receiver) {
                return Reflect.get(store, property, receiver);
            },
            set(_target, property, value, receiver) {
                return Reflect.set(store, property, value, receiver);
            },
            deleteProperty(_target, property) {
                return Reflect.deleteProperty(store, property);
            },
            defineProperty(_target, property, descriptor) {
                return Reflect.defineProperty(store, property, descriptor);
            },
            ownKeys(_target) {
                return Reflect.ownKeys(store);
            },
            getPrototypeOf(_target) {
                return Reflect.getPrototypeOf(store);
            },
            setPrototypeOf(_target, prototype) {
                return Reflect.setPrototypeOf(store, prototype);
            },
            isExtensible(_target) {
                return Reflect.isExtensible(store);
            },
            preventExtensions(_target) {
                return Reflect.preventExtensions(store);
            },
            getOwnPropertyDescriptor(_target, prop) {
                return Reflect.getOwnPropertyDescriptor(store, prop);
            }
        });
    }

    // const store = create({
    //     count: 0,
    //     inc() { this.count++ }
    // })
    const store = create(self => ({
        count: 0,
        inc() { self().count++; }
    }));
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
        const count = store(s => s.count);
        const inc = store(s => s.inc);
        return React__default['default'].createElement("div", null,
            React__default['default'].createElement("div", null, count),
            React__default['default'].createElement("button", { onClick: inc }, "Inc"));
    }
    document.addEventListener('DOMContentLoaded', () => {
        reactDom.render(React__default['default'].createElement("div", { id: 'app' },
            React__default['default'].createElement(Inc, null)), document.querySelector('#app'));
    });

}(React, ReactDOM, mobx));
