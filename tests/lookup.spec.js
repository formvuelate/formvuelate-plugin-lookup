import { computed } from 'vue'
import LookupPlugin from '../src/index.js'

const rawSchema = [
  {
    "model": "firstName",
    "type": "FormText",
    "label": "First Name",
    "mappable": true,
    "unique": false
  },
  {
    "label": "Favorite thing about Vue",
    "required": true,
    "model": "favoriteThingAboutVue",
    "type": "FormSelect",
    "mappable": true,
    "unique": false
  },
  {
    "label": "Are you a Vue fan?",
    "model": "isVueFan",
    "type": "FormCheckbox",
    "mappable": true,
    "unique": false
  }
]

const schema = computed(() => rawSchema)
const warn = jest.spyOn(console, 'warn').mockImplementation();

describe('Lookup Plugin', () => {
  beforeEach(() => jest.clearAllMocks())
  afterAll(() => warn.mockRestore())

  describe('mapComponents', () => {
    it('maps an key value object of components inside the schema', () => {
      const lookup = LookupPlugin({
        mapComponents: {
          'FormText': 'BaseInput'
        },
        mapProps: {
          type: 'component'
        }
      })
      const { parsedSchema } = lookup({ parsedSchema: schema })

      for (let el of parsedSchema.value) {
        expect(el.component).not.toEqual('FormText')
      }

      expect(parsedSchema.value[0].component).toEqual('BaseInput')
    })
  })

  describe('mapProps', () => {
    it('maps props in the schema elements from a key value pair object', () => {
      const lookup = LookupPlugin({
        mapProps: {
          label: 'tag'
        }
      })
      const { parsedSchema } = lookup({ parsedSchema: schema })

      for (let el of parsedSchema.value) {
        expect('tag' in el).toEqual(true)
        expect('label' in el).toEqual(false)
      }
    })

    it('can receive a function to create the mapping', () => {
      const mapper = jest.fn((el) => {
        if (el.type === 'FormText') {
          return {
            mappable: 'remapped',
            type: 'component'
          }
        }

        return {
          type: 'component'
        }
      })

      const lookup = LookupPlugin({
        mapProps: mapper
      })

      const { parsedSchema } = lookup({ parsedSchema: schema })

      expect('mappable' in parsedSchema.value[0]).toBe(false)
      expect('remapped' in parsedSchema.value[0]).toBe(true)

      for (let el of parsedSchema.value) {
        expect('component' in el).toEqual(true)
        expect('type' in el).toEqual(false)
      }
    })

    it('can map a prop as a function', () => {
      const lookup = LookupPlugin({
        mapProps: {
          type: 'component',
          mappable: (el) => {
            if (el.label === "First Name") {
              return 'nameable'
            }

            return false
          }
        }
      })

      const { parsedSchema } = lookup({ parsedSchema: schema })

      for (let el of parsedSchema.value) {
        expect('nameable' in el).toEqual(el.component === 'First Name' ? true : false)
      }
    })

    describe('warnings', () => {
      it('throws a console warning if prop is not found', () => {
        const lookup = LookupPlugin({
          mapProps: {
            foo: 'bar'
          }
        })

        lookup({ parsedSchema: schema })

        expect(warn).toHaveBeenCalledTimes(3)
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('prop "foo" not found'), expect.anything())
      })
    })

    describe('deleting properties', () => {
      it('can delete a property if its equal to false', () => {
        const lookup = LookupPlugin({
          mapProps: {
            label: false
          }
        })
        const { parsedSchema } = lookup({ parsedSchema: schema })

        for (let el of parsedSchema.value) {
          expect('label' in el).toEqual(false)
        }
      })

      it('can delete a property through a function', () => {
        const lookup = LookupPlugin({
          mapProps: (el) => {
            return {
              label: false
            }
          }
        })

        const { parsedSchema } = lookup({ parsedSchema: schema })

        for (let el of parsedSchema.value) {
          expect('label' in el).toEqual(false)
        }
      })
    })
  })
})
