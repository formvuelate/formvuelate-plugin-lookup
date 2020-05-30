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
      'component',
      { parser: componentProp }
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

/**
 *
 * @param {Array} schema - The parsed schema
 * @param {String|Function} prop - The prop to replace or fn to pick the prop
 * @param {String} replacement - The replacement for the prop
 * @param {Object} options
 * @param {Boolean} options.disableWarn - Disable the console warning if prop not found
 * @param {Null|Function} options.parser - A parsing function to replace default behavior
 */
export const replaceProp = (schema, prop, replacement = 'component', { disableWarn = false, parser = null } = {}) => {
  return unwrap(schema).map(el => {
    let replaceProp = prop

    if (typeof prop === 'function') {
      replaceProp = prop(el)
      if (!replaceProp) return el
    }

    if (!(replaceProp in el)) {
      if (!disableWarn) console.warn(`LookupPlugin: prop "${replaceProp}" not found in`, el)
      return el
    }

    const component = el[replaceProp]
    const replacedEl = { ...el }
    delete replacedEl[replaceProp]

    replacedEl[replacement] = component

    return replacedEl
  })
}
