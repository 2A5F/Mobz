import { useEffect, useReducer, useRef, useState } from 'react'
import { CreateObservableOptions, observable, computed, IComputedValueOptions, autorun, IAutorunOptions, reaction, IReactionOptions, IObservableArray, ObservableSet, ObservableMap, AnnotationsMap } from 'mobx'

export function useObservable<T>(v: () => T[], options?: CreateObservableOptions): IObservableArray<T>
export function useObservable<T>(v: () => Set<T>, options?: CreateObservableOptions): ObservableSet<T>
export function useObservable<K, V>(v: () => Map<K, V>, options?: CreateObservableOptions): ObservableMap<K, V>
export function useObservable<T extends object>(v: () => T, decorators?: AnnotationsMap<T, never>, options?: CreateObservableOptions): T
export function useObservable(v: () => any, ...args: any): any {
    return useState(() => observable(v(), ...args))[0]
}

export function useBoxState<T>(v: T | ((...args: any[]) => T), options?: CreateObservableOptions): [T, (v: T) => void] {
    const b = useBox(v, options)
    return [b.get(), (v: T) => b.set(v)]
}

export function useBox<T>(v: T | ((...args: any[]) => T), options?: CreateObservableOptions) {
    return useState(() => observable.box<T>(typeof v === 'function' ? (v as any)() : v, options))[0]
}

export function useComputed<T>(getter: () => T, options?: IComputedValueOptions<T>) {
    return useComputedRaw(getter, options).get()
}

export function useComputedRaw<T>(getter: () => T, options?: IComputedValueOptions<T>) {
    return useState(() => computed(getter, options))[0]
}

export function useAutoEffect(effect: () => void, options?: IAutorunOptions) {
    useEffect(() => autorun(effect, options), [])
}

export function useReaction<T>(data: () => T, effect: (next: T, now: T) => void, options?: IReactionOptions) {
    useEffect(() => reaction(data, effect, options), [])
}

export function useAutoUpdate(o: { get(): any } | (() => void), options?: IAutorunOptions) {
    const first = useRef(true)
    const [, update] = useReducer((c) => c + 1, 0)
    useAutoEffect(() => {
        typeof o === 'function' ? o() : o.get()
        if (first.current) {
            first.current = false
            return
        }
        update()
    }, options)
}

export type StoreSelector<T extends object, R> = (store: T) => R
export type UseStore<T extends object> = <R>(selector: StoreSelector<T, R>, options?: SelectorOptions) => R
export interface SelectorOptions {
    autoUpdate: boolean
}

function useStore<T extends object, R>(store: T, selector: StoreSelector<T, R>, options?: SelectorOptions) {
    const c = useComputedRaw(() => selector(store))
    if (options?.autoUpdate !== false) useAutoUpdate(c)
    return c.get()
}

type NoFunc<T> = T extends (...args: any[]) => any ? NoFunction : T
interface NoFunction { readonly 0: unique symbol }

class MobzAction<F extends (...args: any) => any> {
    constructor(public fn: F) { }
    public invoke = ((...args: any[]) => this.fn(...args)).bind(this)
}

function buildActions<T extends object>(obj: T) {
    const actions: MobzAction<any>[] = []
    for (const key in obj) {
        const i = obj[key]
        if (typeof i === 'function') {
            const a = new MobzAction(i as any)
            actions.push(a)
            obj[key] = a.invoke as any
        }
    }
    return actions
}

function bindActions(obj: any, actions: MobzAction<any>[]) {
    for (const action of actions) {
        action.fn = action.fn.bind(obj)
    }
}

export type CreateFn<T> = (self: () => T) => T

export function create<T extends object>(obj: CreateFn<T>): T & UseStore<T>
export function create<T extends object>(obj: NoFunc<T>): T & UseStore<T>
export function create<T extends object>(obj: NoFunc<T> | CreateFn<T>): T & UseStore<T> {
    const self = () => store
    if (typeof obj === 'function') obj = (obj as any)(self)
    const actions = buildActions(obj)
    const store = observable(obj) as any
    bindActions(store, actions)
    return new Proxy(useStore as any, {
        apply(target, thisArg, argumentsList: [selector: StoreSelector<T, any>, options?: SelectorOptions]) {
            return Reflect.apply(target, thisArg, [store, ...argumentsList])
        },
        construct(target, argumentsList) {
            return Reflect.construct(target, [store, ...argumentsList])
        },
        has(_target, prop) {
            return Reflect.has(store, prop)
        },
        get(_target, property, receiver) {
            return Reflect.get(store, property, receiver)
        },
        set(_target, property, value, receiver) {
            return Reflect.set(store, property, value, receiver)
        },
        deleteProperty(_target, property) {
            return Reflect.deleteProperty(store, property)
        },
        defineProperty(_target, property, descriptor) {
            return Reflect.defineProperty(store, property, descriptor)
        },
        ownKeys(_target) {
            return Reflect.ownKeys(store)
        },
        getPrototypeOf(_target) {
            return Reflect.getPrototypeOf(store)
        },
        setPrototypeOf(_target, prototype) {
            return Reflect.setPrototypeOf(store, prototype)
        },
        isExtensible(_target) {
            return Reflect.isExtensible(store)
        },
        preventExtensions(_target) {
            return Reflect.preventExtensions(store)
        },
        getOwnPropertyDescriptor(_target, prop) {
            return Reflect.getOwnPropertyDescriptor(store, prop)
        }
    })
}

export function define<T extends object>(def: CreateFn<T>): () => T & UseStore<T> {
    return () => useState(() => create<T>(def))[0]
}

export default create;
