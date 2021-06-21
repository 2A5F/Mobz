export * from 'mobx'
/* eslint-disable @typescript-eslint/ban-types */
import { useEffect, useReducer, useRef, useState, createContext, useContext, ReactNode } from 'react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createElement } from 'react'
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
        if (k in obj) runInAction(() => target[k] = obj[k])
        else runInAction(() => delete target[k])
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
        runInAction(() => target[k] = v)
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

/** Merge type */
export type Merge = typeof merge


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

type IntersectionToObj<T> = T extends object ? { [K in keyof T]: T[K] } : never

/** Combine multiple objects  
 * ```ts
 * joint(a, b, c)
 * // Can be understood as
 * { ...a, ...b, ...c }
 * // Actually
 * merge(merge(merge({}, a), b), c)
 * ```
 */
export function joint<T extends object[]>(...objs: T): T extends [] ? {} : IntersectionToObj<UnionToIntersection<T[number]>> {
    const target: unknown = {}
    for (const o of objs) {
        merge(target, o)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return target as any
}

/** Combine multiple objects  
 * ```ts
 * jointMode(mode, a, b, c)
 * // Can be understood as
 * { ...a, ...b, ...c }
 * // Actually
 * merge(merge(merge({}, a, mode), b, mode), c, mode)
 * ```
 */
export function jointMode<T extends object[]>(mode: MergeMode, ...objs: T): T extends [] ? {} : IntersectionToObj<UnionToIntersection<T[number]>> {
    const target: unknown = {}
    for (const o of objs) {
        merge(target, o, mode)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return target as any
}


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

/** Auto effect context */
export type IAutoEffectCtx = {
    setStopSignal: (s: () => Promise<void>) => void
    /** Is it the first run */
    first: boolean
}
/** Auto effect options */
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
export function useAutoUpdate(o?: { get?: () => unknown } | (() => void), options?: IAutorunOptions): void {
    const first = useRef(true)
    const [, update] = useReducer((c) => c + 1, 0)
    useAutoEffect(() => {
        typeof o === 'function' ? o() : o?.get?.()
        if (first.current) {
            first.current = false
            return
        }
        update()
    }, options)
}

/** Selector */
export type StoreSelector<T extends object, R> = (store: T) => R
/** Use the store */
export type UseStore<T extends object> =
    & (<R extends object>(selector: StoreSelector<T, R>, options: SelectorOptions & { sub: true, map?: SubStoreCreateFn<T, R> }) => StoreOf<R>)
    & (<R>(selector: StoreSelector<T, R>, options?: SelectorOptions) => R)

/** The Store */
export type StoreOf<T extends object> = T & UseStore<T>
export type SubStoreCreateFn<S extends object, T extends object> = (parent: S, ...args: Parameters<CreateFn<T>>) => T
/** Selector Options */
export interface SelectorOptions {
    /** Enable auto rerender */
    autoUpdate?: boolean,
    /** return a sub Store */
    sub?: boolean
}

function UseStore<T extends object, R extends object>(store: T, selector: StoreSelector<T, R>, options: SelectorOptions & { sub: true, map?: SubStoreCreateFn<T, R> }): StoreOf<R>
function UseStore<T extends object, R>(store: T, selector: StoreSelector<T, R>, options?: SelectorOptions): R
function UseStore<T extends object, R>(store: T, selector: StoreSelector<T, R>, options?: SelectorOptions) {
    const c = useComputedRaw(() => {
        const r = selector(store)
        if (options != null) {
            if (options.sub) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (typeof (options as any).map === 'function') return (subStore as any)(r, options.sub)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                else return (subStore as any)(r)
            }
        }
        return r
    })
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
        if (typeof i === 'function' && !isStore(i)) {
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

/**  Get the store */
export type GetStore<S> = () => S
/** set/merge store data */
export type SetStore<S> = ((obj: DeepPartial<S>, mode?: MergeMode) => void) & ((obj: (store: S) => DeepPartial<S>, mode?: MergeMode) => void)
/** Create the store */
export type CreateFn<S, R = S> = (self: GetStore<S>, merge: SetStore<S>) => R

/** Context of Store */
export interface StoreContext<T extends object> {
    StoreProvider: (props: { value?: StoreOf<T>, children?: ReactNode }) => JSX.Element
    useStore: () => StoreOf<T>
}
/** Context of Store */
export interface DefinedStoreContext<T extends object> {
    StoreProvider: (props: { value: StoreOf<T>, children?: ReactNode }) => JSX.Element
    useStore: () => StoreOf<T>
}

/** Meta Info for Store */
export interface StoreInfo<T extends object> {
    /** The store object */
    readonly store: T
    /** Get the store */
    readonly get: GetStore<T>
    /** SetMerge store data */
    readonly set: SetStore<T>
    /** Use the store */
    readonly use: UseStore<T>
    /** Getter for clone data (`{ ...store }`) */
    readonly cloned: T
    /** Recreate the store, if this store was created by CreateFn */
    readonly create?: () => T
    /** The CreateFn, if this store was created by CreateFn */
    readonly constructor?: CreateFn<T>
    /** Make a Context for this store */
    readonly makeContext: () => StoreContext<T>
    /** Current Context */
    readonly context?: React.Context<T>
    /** Raw CreateFn to define, if this store was created by define */
    readonly defineCreate?: CreateFn<T>
    /** The define return value, if this store was created by define */
    readonly defined?: ((...args: unknown[]) => StoreOf<T>) & (new (...args: unknown[]) => StoreOf<T>)
}

const infos = new WeakMap<object, StoreInfo<object>>()
const defineds = new WeakMap<Defined<object>, { context?: React.Context<object> }>()

/** Reflect of Store */
export function getStoreInfo<T extends object>(store: StoreOf<T>): StoreInfo<T>
/** Reflect of Store */
export function getStoreInfo<T extends object>(store: T): StoreInfo<T> | null
/** Reflect of Store */
export function getStoreInfo<T extends object>(store: T): StoreInfo<T> | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return infos.get(store) as any ?? null
}

/** Reflect of Store get */
export function storeGet<T extends object>(store: StoreOf<T>): GetStore<T>
/** Reflect of Store get */
export function storeGet<T extends object>(store: T): GetStore<T> | null
/** Reflect of Store get */
export function storeGet<T extends object>(store: T): GetStore<T> | null {
    return getStoreInfo(store)?.get ?? null
}

/** Reflect of Store set */
export function storeSet<T extends object>(store: StoreOf<T>): SetStore<T>
/** Reflect of Store set */
export function storeSet<T extends object>(store: T): SetStore<T> | null
/** Reflect of Store set */
export function storeSet<T extends object>(store: T): SetStore<T> | null {
    return getStoreInfo(store)?.set ?? null
}

/** Reflect of Store use */
export function storeUse<T extends object>(store: StoreOf<T>): UseStore<T>
/** Reflect of Store use */
export function storeUse<T extends object>(store: T): UseStore<T> | null
/** Reflect of Store use */
export function storeUse<T extends object>(store: T): UseStore<T> | null {
    return getStoreInfo(store)?.use ?? null
}

/** Check a object is store */
export function isStore<T extends object>(obj: T): obj is StoreOf<T>
/** Check a object is store */
export function isStore<T extends object>(obj: object): obj is StoreOf<T>
/** Check a object is store */
export function isStore<T extends object>(obj: object): obj is StoreOf<T> {
    return infos.has(obj)
}

/** Make a Context by defined */
export function makeStoreContext<T extends object>(defined: Defined<T>): DefinedStoreContext<T>
/** Make a Context for store */
export function makeStoreContext<T extends object>(store: StoreOf<T>): StoreContext<T>
/** Make a Context for store */
export function makeStoreContext<T extends object>(store: StoreOf<T> | Defined<T>): StoreContext<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let StoreContext: React.Context<StoreOf<T>> = void 0 as any
    let thestore: StoreOf<T>
    if (!isStore<T>(store)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = defineds.get(store as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        StoreContext = ctx?.context as any
        if (StoreContext == null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            StoreContext = createContext<StoreOf<T>>(void 0 as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (ctx != null) ctx.context = StoreContext as any
            StoreContext.displayName = 'StoreContext'
        }
    } else {
        thestore = store
        const info = getStoreInfo(store)
        const defined = info?.defined
        if (defined != null) {
            const ctx = defineds.get(defined)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            StoreContext = ctx?.context as any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (info != null && info?.context == null) (info as any).StoreContext = StoreContext
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (StoreContext == null) StoreContext = info?.context as any
        if (StoreContext == null) {
            StoreContext = createContext<StoreOf<T>>(store)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (info != null) (info as any).StoreContext = StoreContext
            StoreContext.displayName = 'StoreContext'
        }
    }

    function StoreProvider({ value, children }: { value?: StoreOf<T>, children?: ReactNode }): JSX.Element {
        return <StoreContext.Provider value={value ?? thestore}>{children}</StoreContext.Provider>
    }

    function useStore(): StoreOf<T> {
        return useContext(StoreContext)
    }

    return { StoreProvider, useStore }
}

function subStore<S extends object, T extends object = S>(store: NoFunc<S>, map: SubStoreCreateFn<S, T>): StoreOf<T>
function subStore<S extends object>(store: NoFunc<S>): StoreOf<S>
function subStore<S extends object, T extends object = S>(store: NoFunc<S>, map?: SubStoreCreateFn<S, T>) {
    if (map != null) return create((...args) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = (map as any)(store, ...args)
        if (typeof r === 'object' && r != null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r as any)[Symbol('parent')] = store
        }
        return r
    })
    return create(store)
}

/** Create a store */
export function create<T extends object>(obj: CreateFn<T>): StoreOf<T>
/** Create a store */
export function create<T extends object>(obj: NoFunc<T>): StoreOf<T>
/** Create a store */
export function create<T extends object>(obj: NoFunc<T> | CreateFn<T>): StoreOf<T> {
    function get() { return store }
    function set(obj: DeepPartial<T> | ((store: T) => DeepPartial<T>), mode?: MergeMode) {
        return merge(store, typeof obj === 'function' ? obj(store) : obj, mode)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createFn = typeof obj === 'function' ? obj : void 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof obj === 'function') obj = (obj as any)(get, set)
    const actions = buildActions(obj)
    const store = observable(obj) as T
    bindActions(store, actions)
    const meta: StoreInfo<object> = {
        store,
        get, set,
        get cloned(): T { return { ...store } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        use: ((...args: unknown[]) => (UseStore as any)(store, ...args)) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: createFn == null ? void 0 : () => create(createFn as any),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor: createFn as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeContext: () => makeStoreContext(store as any) as any
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (meta as any).meta = meta
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proxyTarget = Object.assign((...args: any) => (UseStore as any)(...args), { store }) as any
    Object.defineProperties(proxyTarget, {
        cloned: {
            get() {
                return meta.cloned
            }
        },
        context: {
            get() {
                return meta.context
            }
        }
    })
    const res = new Proxy(proxyTarget, {
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
            return [...new Set([...Reflect.ownKeys(store), 'prototype'])]
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
        getOwnPropertyDescriptor(target, prop) {
            if (prop === 'prototype') return Reflect.getOwnPropertyDescriptor(target, prop)
            return Reflect.getOwnPropertyDescriptor(store, prop)
        }
    })
    infos.set(res, meta)
    return res
}

/** Create a store with hook */
export function useStore<T extends object>(obj: CreateFn<T>): StoreOf<T>
/** Create a store with hook */
export function useStore<T extends object>(obj: NoFunc<T>): StoreOf<T>
/** Create a store with hook */
export function useStore<T extends object>(obj: NoFunc<T> | CreateFn<T>): StoreOf<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return useState(() => create(obj as any))[0]
}

type CreateFnArg<T, A extends unknown[]> = CreateFn<T, (...args: A) => T>

/** Defined store creator */
export type Defined<T extends object, A extends unknown[] = []> = ((() => StoreOf<T>) & (new () => StoreOf<T>)) | ((...args: A) => StoreOf<T>) & (new (...args: A) => StoreOf<T>)

/** Define a store constructor or hook */
export function define<T extends object>(def: CreateFn<T, NoFunc<T>>): (() => StoreOf<T>) & (new () => StoreOf<T>)
/** Define a store constructor or hook */
export function define<T extends object, A extends unknown[]>(def: CreateFnArg<T, A>): ((...args: A) => StoreOf<T>) & (new (...args: A) => StoreOf<T>)
/** Define a store constructor or hook */
export function define<T extends object, A extends unknown[]>(def: CreateFn<T, NoFunc<T> | ((...args: A) => T)>): (...args: A) => StoreOf<T> {
    function defined(...args: unknown[]) {
        function build() {
            const r = create<T>((self, set) => {
                const r = def(self, set)
                if (typeof r === 'function') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return (r as any)(...args)
                }
                return r
            })
            const info = infos.get(r)
            if (info != null) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (info as any).defineCreate = def;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (info as any).defined = defined;
            }
            return r
        }
        if (!new.target) return useState(build)[0]
        return build()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defineds.set(defined as any, {})
    return defined
}

/** Provide template CreateFn */
export function template<T>(def: CreateFn<T>): CreateFn<T>
/** Provide template CreateFn */
export function template<T, A extends unknown[]>(def: CreateFnArg<T, A>): CreateFnArg<T, A>
/** Provide template CreateFn */
export function template<F extends CreateFn<unknown>>(def: F): F
/** Provide template CreateFn */
export function template<F extends CreateFnArg<unknown, unknown[]>>(def: F): F
/** Provide template CreateFn */
export function template<T>(): <F extends CreateFn<T>>(def: F) => F
/** Provide template CreateFn */
export function template<T>(): <F extends CreateFnArg<T, unknown[]>>(def: F) => F
/** Provide template CreateFn */
export function template<T, A extends unknown[]>(): <F extends CreateFnArg<T, A>>(def: F) => F
/** Provide template CreateFn */
export function template(v?: unknown): unknown {
    if (v == null) return (v: unknown) => v
    return v
}

export default create;
