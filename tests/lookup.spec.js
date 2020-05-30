import LookupPlugin from '../src/index.js'

const schema = [
  {
    "model": "firstName",
    "type": "FormText",
    "label": "First Name",
    "mappable": true
  },
  {
    "label": "Favorite thing about Vue",
    "required": true,
    "model": "favoriteThingAboutVue",
    "type": "FormSelect",
    "mappable": true
  },
  {
    "label": "Are you a Vue fan?",
    "model": "isVueFan",
    "type": "FormCheckbox",
    "mappable": true
  }
]

const warn = jest.spyOn(console, 'warn').mockImplementation();

describe('Lookup Plugin', () => {
  beforeEach(() => jest.clearAllMocks())
  afterAll(() => warn.mockRestore())

  describe('componentProp', () => {
    it('replaces the component prop with the given one in config', () => {
      const lookup = LookupPlugin({ componentProp: 'type' })
      const { parsedSchema } = lookup({
        parsedSchema: schema
      })

      for (let el of parsedSchema) {
        expect('component' in el).toEqual(true)
        expect('type' in el).toEqual(false)
      }
    })

    it('throws a console warning if the component prop is not found', () => {
      const lookup = LookupPlugin({ componentProp: 'type' })
      lookup({
        parsedSchema: [
          {
            "model": "firstName",
            "other": "FormText",
            "label": "First Name"
          },
        ]
      })

      expect(warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('mapComponents', () => {
    it('maps an key value object of components inside the schema', () => {
      const lookup = LookupPlugin({
        componentProp: 'type',
        mapComponents: {
          'FormText': 'BaseInput'
        }
      })
      const { parsedSchema } = lookup({ parsedSchema: schema })

      for (let el of parsedSchema) {
        expect(el.component).not.toEqual('FormText')
      }

      expect(parsedSchema[0].component).toEqual('BaseInput')
    })

    it('can receive a custom parsing function', () => {
      const componentProp = jest.fn((el) => {
        // Switch component prop to type
        if (el.model === 'firstName') return 'type'

        // Skip parsing this component
        return false
      })

      const lookup = LookupPlugin({
        componentProp
      })

      const { parsedSchema } = lookup({ parsedSchema: schema })

      expect(componentProp).toHaveBeenCalledTimes(3)
      expect(parsedSchema[0].component).toEqual('FormText')
      expect(parsedSchema[1].component).toBeUndefined()
      expect(parsedSchema[1].type).toEqual('FormSelect')
      expect(parsedSchema[2].component).toBeUndefined()
      expect(parsedSchema[2].type).toEqual('FormCheckbox')
    })
  })

  describe('mapProps', () => {
    it('maps props in the schema elements from a key value pair object', () => {
      const lookup = LookupPlugin({
        componentProp: 'type',
        mapProps: {
          label: 'tag'
        }
      })
      const { parsedSchema } = lookup({ parsedSchema: schema })

      for (let el of parsedSchema) {
        expect('tag' in el).toEqual(true)
        expect('label' in el).toEqual(false)
      }
    })

    it('disables warnings for elements without a particular prop', () => {
      const lookup = LookupPlugin({
        componentProp: 'type',
        mapProps: {
          required: 'mandatory'
        }
      })
      const { parsedSchema } = lookup({ parsedSchema: schema })

      expect(warn).not.toHaveBeenCalled()
    })

    it('can receive a function to create the mapping', () => {
      const mapper = jest.fn((el) => {
        if (el.component === 'FormText') {
          return {
            mappable: 'remapped'
          }
        }

        return {}
      })

      const lookup = LookupPlugin({
        componentProp: 'type',
        mapProps: mapper
      })

      const { parsedSchema } = lookup({ parsedSchema: schema })

      expect('mappable' in parsedSchema[0]).toBe(false)
      expect('remapped' in parsedSchema[0]).toBe(true)
    })
  })
})
