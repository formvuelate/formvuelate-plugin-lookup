import { isRef } from 'vue'
const unwrap = v => isRef(v) ? v.value : v

/**
 * LookupPlugin
 * @param {String} prop0.componentProp - Main property that holds the component definition
 * @param {Object} prop0.mapComponents - Key value pair of component mapping
 * @param {Object} prop0.mapProps - Key value pair of prop mapping
 * 
 * @returns {Function}
 */
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
        const replacedEl = { ...el }
        delete replacedEl[prop]

        replacedEl[replacement] = component

        return replacedEl
    })
}
