import { useEffect, useReducer, useRef, useState } from 'react'
import { CreateObservableOptions, observable, computed, IComputedValueOptions, autorun, IAutorunOptions, reaction, IReactionOptions, IObservableArray, ObservableSet, ObservableMap, AnnotationsMap, runInAction } from 'mobx'

type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> }

function doMergeReplace(target: any, obj: any) {
    for (const k of Reflect.ownKeys(target)) {
        if (k in obj) target[k] = obj[k]
        else delete target[k]
    }
}

/** Default is `merge`  
 * `true` == `replace`   */
export type MergeMode = boolean | 'merge' | 'replace'

/** Merge object content to target */
export function merge<T>(target: T, obj: DeepPartial<T>, mode?: MergeMode) {
    if (obj === target) return
    if (mode === true || mode === 'replace') {
        runInAction(() => doMergeReplace(target, obj))
    } else {
        runInAction(() => Object.assign(target, obj))
    }
}

/** HookApi of `observable()` */
export function useObservable<T>(v: () => T[], options?: CreateObservableOptions): IObservableArray<T>
/** HookApi of `observable()` */
export function useObservable<T>(v: () => Set<T>, options?: CreateObservableOptions): ObservableSet<T>
/** HookApi of `observable()` */
export function useObservable<K, V>(v: () => Map<K, V>, options?: CreateObservableOptions): ObservableMap<K, V>
/** HookApi of `observable()` */
export function useObservable<T extends object>(v: () => T, decorators?: AnnotationsMap<T, never>, options?: CreateObservableOptions): T
export function useObservable(v: () => any, ...args: any): any {
    return useState(() => observable(v(), ...args))[0]
}

/** Boxed state, need `observer()` */
export function useBoxState<T>(v: T | ((...args: any[]) => T), options?: CreateObservableOptions): [T, (v: T) => void] {
    const b = useBox(v, options)
    return [b.get(), (v: T) => b.set(v)]
}

/** HookApi of `observable.box()` */
export function useBox<T>(v: T | ((...args: any[]) => T), options?: CreateObservableOptions) {
    return useState(() => observable.box<T>(typeof v === 'function' ? (v as any)() : v, options))[0]
}

/** Computed value, need `observer()` */
export function useComputed<T>(getter: () => T, options?: IComputedValueOptions<T>) {
    return useComputedRaw(getter, options).get()
}

/** HookApi of `computed()` */
export function useComputedRaw<T>(getter: () => T, options?: IComputedValueOptions<T>) {
    return useState(() => computed(getter, options))[0]
}

export type IAutoEffectCtx = {
    setStopSignal: (s: () => Promise<void>) => void
    /** Is it the first run */
    first: boolean
}
export type IAutoEffectOptions = {
    stopSignal?: () => Promise<void>
}
/** HookApi of `autorun()` */
export function useAutoEffect(effect: (ctx: IAutoEffectCtx) => any, options?: IAutorunOptions & IAutoEffectOptions) {
    useEffect(() => {
        let stopSignal = options?.stopSignal
        let first = true
        const ctx: IAutoEffectCtx = {
            setStopSignal(s) {
                stopSignal = s
            },
            get first() {
                return first
            }
        }
        const d = autorun(() => {
            effect(ctx)
            first = false
        }, options)
        if (typeof stopSignal === 'function') {
            (async () => {
                await stopSignal()
                d()
            })();
        }
        return d
    }, [])
}

/** HookApi of `reaction()` */
export function useReaction<T>(data: () => T, effect: (next: T, now: T) => void, options?: IReactionOptions) {
    useEffect(() => reaction(data, effect, options), [])
}

/** Auto rerender */
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
    /** Enable auto rerender */
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
    for (const a of actions) {
        a.fn = a.fn.bind(obj)
    }
}

export type CreateFn<S, R = S> = (self: () => S) => R

/** Create a store */
export function create<T extends object>(obj: CreateFn<T>): T & UseStore<T>
/** Create a store */
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

/** Define a store constructor or hook */
export function define<T extends object>(def: CreateFn<T, NoFunc<T>>): (() => T & UseStore<T>) & (new () => T & UseStore<T>)
/** Define a store constructor or hook */
export function define<T extends object, A extends any[]>(def: CreateFn<T, (...args: A) => T>): ((...args: A) => T & UseStore<T>) & (new (...args: A) => T & UseStore<T>)
export function define<T extends object, A extends any[]>(def: CreateFn<T, NoFunc<T> | ((...args: A) => T)>): (...args: A) => T & UseStore<T> {
    return function (...args: any) {
        function build() {
            return create<T>(self => {
                const r = def(self)
                if (typeof r === 'function') {
                    return (r as any)(...args)
                }
                return r
            })
        }
        if (!new.target) return useState(build)[0]
        return build()
    }
}

export default create;
