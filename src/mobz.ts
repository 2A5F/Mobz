export * from 'mobx'
/* eslint-disable @typescript-eslint/ban-types */
import { useEffect, useReducer, useRef, useState } from 'react'
import { CreateObservableOptions, observable, computed, IComputedValueOptions, autorun, IAutorunOptions, reaction, IReactionOptions, IObservableArray, ObservableSet, ObservableMap, AnnotationsMap, runInAction, IObservableValue, IComputedValue } from 'mobx'

const plainObjectString = Object.toString()

function isObject(value: unknown): value is Object {
    return value !== null && typeof value === "object"
}

function isPlainObject(value: unknown) {
    if (!isObject(value)) return false
    const proto = Object.getPrototypeOf(value)
    if (proto == null) return true
    return proto.constructor?.toString() === plainObjectString
}

function* concat<T>(a: Iterable<T>, b: Iterable<T>): Iterable<T> {
    yield* a
    yield* b
}

type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function doMergeReplace(target: any, obj: any) {
    for (const k of new Set(concat(Reflect.ownKeys(target), Reflect.ownKeys(obj)))) {
        if (k in obj) target[k] = obj[k]
        else delete target[k]
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function doMergeDeep(target: any, obj: any) {
    obj = Object.assign({}, obj)
    for (const k of Reflect.ownKeys(obj)) {
        const v = obj[k]
        if (isPlainObject(v)) {
            const t = target[k]
            if (isPlainObject(t)) {
                if (t !== v) {
                    doMergeDeep(t, v)
                    continue
                }
            }
        }
        target[k] = v
    }
}

/** Default is `deep`  
 * `true` == `replace`  
 * `false` == `deep` */
export type MergeMode = boolean | 'replace' | 'shallow' | 'deep'

/** Merge object content to target */
export function merge<T>(target: T, obj: DeepPartial<T>, mode?: MergeMode): void {
    if (obj === target) return
    if (mode === true || mode === 'replace') {
        runInAction(() => doMergeReplace(target, obj))
    } else if (mode === 'shallow') {
        runInAction(() => Object.assign(target, obj))
    } else if (mode == null || mode === false || mode === 'deep') {
        runInAction(() => doMergeDeep(target, obj))
    } else {
        throw new TypeError(`Unknow merge mode ${JSON.stringify(mode)}`)
    }
}

export type Merge = typeof merge

/** HookApi of `observable()` */
export function useObservable<T>(v: () => T[], options?: CreateObservableOptions): IObservableArray<T>
/** HookApi of `observable()` */
export function useObservable<T>(v: () => Set<T>, options?: CreateObservableOptions): ObservableSet<T>
/** HookApi of `observable()` */
export function useObservable<K, V>(v: () => Map<K, V>, options?: CreateObservableOptions): ObservableMap<K, V>
/** HookApi of `observable()` */
export function useObservable<T extends object>(v: () => T, decorators?: AnnotationsMap<T, never>, options?: CreateObservableOptions): T
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function useObservable(v: () => any, ...args: any): any {
    return useState(() => observable(v(), ...args))[0]
}

/** Boxed state, need `observer()` */
export function useBoxState<T>(v: T | ((...args: unknown[]) => T), options?: CreateObservableOptions): [T, (v: T) => void] {
    const b = useBox(v, options)
    return [b.get(), (v: T) => b.set(v)]
}

/** HookApi of `observable.box()` */
export function useBox<T>(v: T | ((...args: unknown[]) => T), options?: CreateObservableOptions): IObservableValue<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return useState(() => observable.box<T>(typeof v === 'function' ? (v as any)() : v, options))[0]
}

/** Computed value, need `observer()` */
export function useComputed<T>(getter: () => T, options?: IComputedValueOptions<T>): T {
    return useComputedRaw(getter, options).get()
}

/** HookApi of `computed()` */
export function useComputedRaw<T>(getter: () => T, options?: IComputedValueOptions<T>): IComputedValue<T> {
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
export function useAutoEffect(effect: (ctx: IAutoEffectCtx) => void, options?: IAutorunOptions & IAutoEffectOptions): void {
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
export function useReaction<T>(data: () => T, effect: (next: T, now: T) => void, options?: IReactionOptions): void {
    useEffect(() => reaction(data, effect, options), [])
}

/** Auto rerender */
export function useAutoUpdate(o: { get(): unknown } | (() => void), options?: IAutorunOptions): void {
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

type NoFunc<T> = T extends (...args: unknown[]) => unknown ? NoFunction : T
interface NoFunction { readonly 0: unique symbol }

class MobzAction<F extends (...args: unknown[]) => unknown> {
    constructor(public fn: F) { }
    public invoke = ((...args: unknown[]) => this.fn(...args)).bind(this)
}

function buildActions<T extends object>(obj: T) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions: MobzAction<any>[] = []
    for (const key in obj) {
        const i = obj[key]
        if (typeof i === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const a = new MobzAction(i as any)
            actions.push(a)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            obj[key] = a.invoke as any
        }
    }
    return actions
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bindActions(obj: any, actions: MobzAction<any>[]) {
    for (const a of actions) {
        a.fn = a.fn.bind(obj)
    }
}

export type GetStore<S> = () => S
export type SetStore<S> = ((obj: DeepPartial<S>, mode?: MergeMode) => void) & ((obj: (store: S) => DeepPartial<S>, mode?: MergeMode) => void)
export type CreateFn<S, R = S> = (self: GetStore<S>, merge: SetStore<S>) => R

/** Create a store */
export function create<T extends object>(obj: CreateFn<T>): T & UseStore<T>
/** Create a store */
export function create<T extends object>(obj: NoFunc<T>): T & UseStore<T>
export function create<T extends object>(obj: NoFunc<T> | CreateFn<T>): T & UseStore<T> {
    function self() { return store }
    function set(obj: DeepPartial<T> | ((store: T) => DeepPartial<T>), mode?: MergeMode) {
        return merge(store, typeof obj === 'function' ? obj(store) : obj, mode)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof obj === 'function') obj = (obj as any)(self, set)
    const actions = buildActions(obj)
    const store = observable(obj) as T
    bindActions(store, actions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy(useStore as any, {
        apply(target, thisArg, argumentsList: [selector: StoreSelector<T, unknown>, options?: SelectorOptions]) {
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
        ownKeys() {
            return Reflect.ownKeys(store)
        },
        getPrototypeOf() {
            return Reflect.getPrototypeOf(store)
        },
        setPrototypeOf(_target, prototype) {
            return Reflect.setPrototypeOf(store, prototype)
        },
        isExtensible() {
            return Reflect.isExtensible(store)
        },
        preventExtensions() {
            return Reflect.preventExtensions(store)
        },
        getOwnPropertyDescriptor(_target, prop) {
            return Reflect.getOwnPropertyDescriptor(store, prop)
        }
    })
}

type CreateFnArg<T, A extends unknown[]> = CreateFn<T, (...args: A) => T>

/** Define a store constructor or hook */
export function define<T extends object>(def: CreateFn<T, NoFunc<T>>): (() => T & UseStore<T>) & (new () => T & UseStore<T>)
/** Define a store constructor or hook */
export function define<T extends object, A extends unknown[]>(def: CreateFnArg<T, A>): ((...args: A) => T & UseStore<T>) & (new (...args: A) => T & UseStore<T>)
export function define<T extends object, A extends unknown[]>(def: CreateFn<T, NoFunc<T> | ((...args: A) => T)>): (...args: A) => T & UseStore<T> {
    return function (...args: unknown[]) {
        function build() {
            return create<T>((self, set) => {
                const r = def(self, set)
                if (typeof r === 'function') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return (r as any)(...args)
                }
                return r
            })
        }
        if (!new.target) return useState(build)[0]
        return build()
    }
}

export function template<F extends CreateFn<unknown>>(def: F): F
export function template<F extends CreateFnArg<unknown, unknown[]>>(def: F): F
export function template<T>(): <F extends CreateFn<T>>(def: F) => F
export function template<T>(): <F extends CreateFnArg<T, unknown[]>>(def: F) => F
export function template<T, A extends unknown[]>(): <F extends CreateFnArg<T, A>>(def: F) => F
export function template(v?: unknown): unknown {
    if (v == null) return (v: unknown) => v
    return v
}

export default create;
