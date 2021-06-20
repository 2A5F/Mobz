import typescript from 'rollup-plugin-typescript2'
import { terser } from "rollup-plugin-terser"

export default [
    {
        input: 'src/tests/inc.tsx',
        output: {
            file: 'test/tests/inc.js',
            format: 'iife',
            exports: 'named',
            globals: {
                react: 'React',
                'react-dom': 'ReactDOM',
                mobx: 'mobx'
            }
        },
        external: ['react', 'react-dom', 'mobx'],
        plugins: [
            typescript()
        ]
    },
    {
        input: 'src/mobz.tsx',
        output: {
            file: 'dist/mobz.cjs.js',
            format: 'cjs',
            exports: 'named',
        },
        external: ['react', 'mobx'],
        plugins: [
            typescript()
        ]
    },
    {
        input: 'src/mobz.tsx',
        output: {
            file: 'dist/mobz.umd.js',
            format: 'umd',
            exports: 'named',
            name: 'mobz',
            globals: {
                react: 'React',
                mobx: 'mobx'
            }
        },
        external: ['react', 'mobx'],
        plugins: [
            typescript()
        ]
    },
    {
        input: 'src/mobz.tsx',
        output: {
            file: 'dist/mobz.es.js',
            format: 'es',
            exports: 'named',
        },
        external: ['react', 'mobx'],
        plugins: [
            typescript()
        ]
    },
    
    {
        input: 'src/mobz.tsx',
        output: {
            file: 'dist/mobz.cjs.min.js',
            format: 'cjs',
            exports: 'named',
        },
        external: ['react', 'mobx'],
        plugins: [
            terser(),
            typescript()
        ]
    },
    {
        input: 'src/mobz.tsx',
        output: {
            file: 'dist/mobz.umd.min.js',
            format: 'umd',
            exports: 'named',
            name: 'mobz',
            globals: {
                react: 'React',
                mobx: 'mobx'
            }
        },
        external: ['react', 'mobx'],
        plugins: [
            terser(),
            typescript()
        ]
    },
    {
        input: 'src/mobz.tsx',
        output: {
            file: 'dist/mobz.es.min.js',
            format: 'es',
            exports: 'named',
        },
        external: ['react', 'mobx'],
        plugins: [
            terser(),
            typescript()
        ]
    }
]
