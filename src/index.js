import { computed } from 'vue'

/**
 * LookupPlugin
 * @param {Object} configuration
 * @param {Object|Function} configuration.mapComponents - Key value pair of component mapping or a function that returns it
 * @param {Object|Function} configuration.mapProps - Key value pair of prop mapping or a function that returns it
 *
 * @returns {Function}
 */
export default function LookupPlugin ({ mapComponents = {}, mapProps = null }) {
  return function (baseReturns) {
    const { parsedSchema } = baseReturns

    let replacedSchema = mapProperties(parsedSchema.value, mapProps)
    replacedSchema = mapComps(replacedSchema, mapComponents)

    return {
      ...baseReturns,
      parsedSchema: computed(() => replacedSchema)
    }
  }
}

export const loopElementsInSchema = (schema, fn) => schema.map(row => row.map(el => fn(el)))

/**
 * Remap components in a schema
 * @param {Array} schema - The schema
 * @param {Object|Function} mapComponents
* @returns {Array}
 */
const mapComps = (schema, mapComponents) => {
  return schema.map(row => row.map(el => {
    const newKey = mapComponents[el.component]

    if (!newKey) return { ...el }

    return {
      ...el,
      component: mapComponents[el.component]
    }
  }))
}

/**
 * Remap properties in a schema
 * @param {Array} schema - The schema
 * @param {Function|Object} mapProps - A key pair value object or function that returns it
 * @returns {Array}
 */
const mapProperties = (schema, mapProps) => {
  if (!mapProps || !['object', 'function'].includes(typeof mapProps)) return schema

  if (typeof mapProps === 'function') {
    return loopElementsInSchema(schema, el => {
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

  let schemaCopy
  for (const prop in mapProps) {
    schemaCopy = loopElementsInSchema(schema, el => {
      return replacePropInElement(el, prop, mapProps[prop])
    })
  }

  return schemaCopy
}

/**
 *
 * @param {Object} el - The element to replace props in
 * @param {String} prop - The prop to replace or fn to pick the prop
 * @param {String|Function|Boolean} replacement - The replacement for the prop, a function that returns it or the boolean "false" to delete it
 */
const replacePropInElement = (el, prop, replacement) => {
  let propReplacement = replacement
  if (typeof replacement === 'function') {
    // If replacement is a function, call it to get
    // the prop to be replaced. If its falsey, then return
    // the element as is
    propReplacement = replacement(el)

    if (!propReplacement) return el
  }

  if (!(prop in el)) {
    if (process.env && process.env.NODE_ENV !== 'production') {
      console.warn(`LookupPlugin: property "${prop}" not found in`, el)
    }

    // Return the el without replacing
    return el
  }

  const originalValue = el[prop]
  const elementCopy = { ...el }

  delete elementCopy[prop]

  if (propReplacement === false) {
    return elementCopy
  }

  elementCopy[propReplacement] = originalValue

  return elementCopy
}
