import { computed } from 'vue'

/**
 * LookupPlugin
 * @param {Object} configuration
 * @param {Object|Function} configuration.mapComponents - Key value pair of component mapping or a function that returns it
 * @param {Object|Function} configuration.mapProps - Key value pair of prop mapping or a function that returns it
 *
 * @returns {Function}
 */
export default function LookupPlugin ({ mapComponents = {}, mapProps = {} }) {
  return function (baseReturns) {
    let { parsedSchema } = baseReturns

    let replacedSchema = mapProperties(parsedSchema.value, mapProps)
    replacedSchema = mapComps(replacedSchema, mapComponents)

    return {
      ...baseReturns,
      parsedSchema: computed(() => replacedSchema)
    }
  }
}

/**
 * Remap components in a schema
 * @param {Array} schema - The schema
 * @param {Object|Function} mapComponents
* @returns {Array}
 */
const mapComps = (schema, mapComponents) => {
  return schema.map(el => {
    const newKey = mapComponents[el.component]

    if (!newKey) return { ...el }

    return {
      ...el,
      component: mapComponents[el.component]
    }
  })
}

/**
 * Remap properties in a schema
 * @param {Array} schema - The schema
 * @param {Function|Object} mapProps - A key pair value object or function that returns it
 * @returns {Array}
 */
const mapProperties = (schema, mapProps) => {
  if (typeof mapProps === 'function') {
    return schema.map(el => {
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
  if (typeof mapProps === 'object') {
    for (const prop in mapProps) {
      schemaCopy = schema.map(el => {
        return replacePropInElement(el, prop, mapProps[prop])
      })
    }
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
  let propToBeReplaced = prop

  // If replacement is a function, call it to get
  // the prop to be replaced. If its falsey, then return
  // the element as is
  if (typeof replacement === 'function') {
    propToBeReplaced = replacement(el)
    if (!propToBeReplaced) return el
  }

  if (!(propToBeReplaced in el)) {
    if (process.env && process.env.NODE_ENV !== 'production') {
      console.warn(`LookupPlugin: prop "${propToBeReplaced}" not found in`, el)
    }

    return el
  }

  const originalValue = el[propToBeReplaced]
  const elementCopy = { ...el }

  if (replacement === false) {
    delete elementCopy[propToBeReplaced]

    return elementCopy
  }

  delete elementCopy[propToBeReplaced]

  elementCopy[replacement] = originalValue

  return elementCopy
}
