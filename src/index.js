import { isRef } from 'vue'
const unwrap = v => isRef(v) ? v.value : v

/**
 * LookupPlugin
 * @param {Object} configuration
 * @param {Object} configuration.mapComponents - Key value pair of component mapping
 * @param {Object|Function} configuration.mapProps - Key value pair of prop mapping or a function that returns it
 *
 * @returns {Function}
 */
export default function LookupPlugin ({ mapComponents = {}, mapProps = {} }) {
  return function (baseReturns) {
    const { parsedSchema } = baseReturns
    let replacedSchema = mapProperties(parsedSchema, mapProps)

    replacedSchema = unwrap(replacedSchema).map(el => {
      const newKey = mapComponents[el.component]

      if (!newKey) return { ...el }

      return {
        ...el,
        component: mapComponents[el.component]
      }
    })

    return {
      ...baseReturns,
      parsedSchema: replacedSchema
    }
  }
}

/**
 * Remap properties in a schema
 * @param {Array} schema - The schema
 * @param {Function|Object} mapProps - A key pair value object or function that returns it
 */
const mapProperties = (schema, mapProps) => {
  let replacedSchema = [...schema]

  if (typeof mapProps === 'function') {
    replacedSchema = unwrap(replacedSchema).map(el => {
      let replacedEl = el
      const map = mapProps(replacedEl)
      for (const prop in map) {
        replacedEl = replacePropInElement(
          replacedEl, prop, map[prop]
        )
      }

      return replacedEl
    })
  }

  if (typeof mapProps === 'object') {
    for (const prop in mapProps) {
      replacedSchema = replacePropInSchema(
        replacedSchema,
        prop,
        mapProps[prop]
      )
    }
  }

  return replacedSchema
}

/**
 *
 * @param {Array} schema - The parsed schema
 * @param {String|Function} prop - The prop to replace or fn to pick the prop
 * @param {String} replacement - The replacement for the prop
 */
const replacePropInSchema = (schema, prop, replacement) => {
  return unwrap(schema).map(el => {
    return replacePropInElement(el, prop, replacement)
  })
}

/**
 *
 * @param {Object} el - The element to replace props in
 * @param {String|Function} prop - The prop to replace or fn to pick the prop
 * @param {String} replacement - The replacement for the prop
 */
const replacePropInElement = (el, prop, replacement) => {
  let replaceProp = prop

  if (typeof prop === 'function') {
    replaceProp = prop(el)
    if (!replaceProp) return el
  }

  if (!(replaceProp in el)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`LookupPlugin: prop "${replaceProp}" not found in`, el)
    }

    return el
  }

  const componentSpec = el[replaceProp]
  const replacedEl = { ...el }

  if (replaceProp === false) {
    delete replacedEl[replaceProp]

    return replacedEl
  }

  delete replacedEl[replaceProp]

  replacedEl[replacement] = componentSpec

  return replacedEl
}
