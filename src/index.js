import { isRef } from 'vue'
const unwrap = v => isRef(v) ? v.value : v

export default function LookupPlugin ({ componentProp = 'component', mapComponents = {}, mapProps = {} }) {
    return function (baseReturns, props) {
        const { parsedSchema } = baseReturns
        let replacedProps = replaceProp(
            parsedSchema,
            componentProp,
            'component'
        )

        for (const prop in mapProps) {
            replacedProps = replaceProp(
                replacedProps,
                prop,
                mapProps[prop],
                { disableWarn: true }
            )
        }

        const replacedKeys = unwrap(replacedProps).map(el => {
            const newKey = mapComponents[el.component]

            if (!newKey) return { ...el }

            return {
                ...el,
                component: mapComponents[el.component]
            }
        })

        return {
            ...baseReturns,
            parsedSchema: replacedKeys
        }
    }
}

export const replaceProp = (schema, prop, replacement = 'component', { disableWarn = false } = {}) => {
    return unwrap(schema).map(el => {
        if (!(prop in el)) {
            if (!disableWarn) console.warn(`LookupPlugin: prop "${prop}" not found in`, el)
            return el
        }

        const component = el[prop]
        delete el[prop]

        el[replacement] = component

        return {
            ...el
        }
    })
}
