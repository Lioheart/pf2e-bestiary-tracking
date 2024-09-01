import { getIWRString } from "../scripts/helpers";

const fields = foundry.data.fields;

export const toggleStringField = () => new fields.SchemaField({
    revealed: new fields.BooleanField({ required: true, initial: false }),
    value: new fields.StringField({ required: true }),
    custom: new fields.StringField({}),
}) 

export const toggleNumberField = () => new fields.SchemaField({
    revealed: new fields.BooleanField({ required: true, initial: false }),
    value: new fields.NumberField({ required: true, integer: true }),
    custom: new fields.StringField({}),
}) 

export const getCreatureData = (actor) => {
    return {
        type: 'pf2e-bestiary-tracking.creature',
        name: actor.name,
        system: {
            uuid: actor.uuid,
            img: actor.img,
            texture: actor.prototypeToken.texture.src,
            name: { value: actor.name },
            ac: { value: Number.parseInt(actor.system.attributes.ac.value) },
            hp: { value: Number.parseInt(actor.system.attributes.hp.value) },
            level: { value: Number.parseInt(actor.system.details.level.value) },
            size: actor.system.traits.size.value,
            rarity: { value: actor.system.traits.rarity },
            traits: actor.system.traits.value.map(trait => ({ value: trait })),
            skills: Object.keys(actor.system.skills).map(key => ({
              value: Number.parseInt(actor.system.skills[key].base),
              totalModifier: Number.parseInt(actor.system.skills[key].totalModifier), 
            })),
            saves: {
              fortitude: { value: actor.system.saves.fortitude.value },
              reflex: { value: actor.system.saves.reflex.value },
              will: { value: actor.system.saves.will.value },
            },
            speeds: {
              details: { },
              values: [
                { name: 'Land', value: actor.system.attributes.speed.value },
                ...actor.system.attributes.speed.otherSpeeds.map(speed => ({
                  name: speed.label,
                  value: speed.value
                }))
              ],  
            },
            abilities: Object.keys(actor.system.abilities).map(key => ({
              key: key,
              mod: actor.system.abilities[key].mod,
            })),
            senses: {
              perception: { value: actor.system.perception.value },
              details: { value: actor.system.perception.details.value },
              senses: actor.system.perception.senses.map(sense => ({ value: sense.type }))
            },
            languages: {
              details: { value: actor.system.details.languages.details },
              values: actor.system.details.languages.value.map(language => ({
                value: language,
              }))
            },
            immunities: Object.keys(actor.system.attributes.immunities).reduce((acc, key) => {
                const immunity = actor.system.attributes.immunities[key];
                acc[getIWRString(immunity)] = { 
                    revealed: false, 
                    value: immunity.value, 
                    exceptions:  immunity.exceptions.map(exception => ({ value: exception })),
                };

                return acc;
            }, {}),
            weaknesses: Object.keys(actor.system.attributes.weaknesses).reduce((acc, key) => {
                const weakness = actor.system.attributes.weaknesses[key];
                acc[getIWRString(weakness)] = { 
                    revealed: false, 
                    value: weakness.value, 
                    exceptions:  weakness.exceptions.map(exception => ({ value: exception })),
                };

                return acc;
            }, {}),
            resistances: Object.keys(actor.system.attributes.resistances).reduce((acc, key) => {
                const resistance = actor.system.attributes.resistances[key];
                acc[getIWRString(resistance)] = { 
                    revealed: false, 
                    value: resistance.value, 
                    exceptions:  resistance.exceptions.map(exception => ({ value: exception })),
                };

                return acc;
            }, {}),
            attacks: Object.keys(actor.system.actions).reduce((acc, actionKey) => {
              const attack = actor.system.actions[actionKey];
              const item = actor.items.get(attack.item.id);
              const traits = item.system.traits.value.map(trait => ({ value: trait }));
              
              if(item.type === 'melee' || item.type === 'equipment'){
                acc[attack.item.id] = {
                  name: attack.label,
                  actions: attack.glyph,
                  totalModifier: attack.totalModifier,
                  isMelee: attack.weapon.isMelee,
                  damageRolls: Object.keys(item.system.damageRolls).map(damage => ({ 
                    damageType: { value: item.system.damageRolls[damage].damageType } 
                  })),
                  traits: traits,
                  rules: item.system.rules,
                };
              }

              return acc;
            }, {}),
            actions: Array.from(actor.items).reduce((acc, action) => {
              if(action.type === 'action' && action.system.actionType.value !== 'passive'){
                acc[action.id] = {
                  label: action.system.label,
                  traits: action.system.traits.value.map(trait => ({ value: trait.value })),
                  description: action.system.description.value,
                };
              }

              return acc;
            }, {}),
            passives: Array.from(actor.items).reduce((acc, action) => {
              if(action.type === 'action' && action.system.actionType.value === 'passive'){
                acc[action.id] = {
                  label: action.system.label,
                  traits: action.system.traits.value.map(trait => ({ value: trait.value })),
                  description: action.system.description.value,
                };
              }

              return acc;
            }, {}),
            // spells: ,
            notes: {
              public: { value: actor.system.details.publicNotes },
              private: { value: actor.system.details.privateNotes },
            },
        }
    };
}

export class MappingField extends foundry.data.fields.ObjectField {
    constructor(model, options) {
      if ( !(model instanceof foundry.data.fields.DataField) ) {
        throw new Error("MappingField must have a DataField as its contained element");
      }
      super(options);
  
      /**
       * The embedded DataField definition which is contained in this field.
       * @type {DataField}
       */
      this.model = model;
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    static get _defaults() {
      return foundry.utils.mergeObject(super._defaults, {
        initialKeys: null,
        initialValue: null,
        initialKeysOnly: false
      });
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    _cleanType(value, options) {
      Object.entries(value).forEach(([k, v]) => value[k] = this.model.clean(v, options));
      return value;
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    getInitialValue(data) {
      let keys = this.initialKeys;
      const initial = super.getInitialValue(data);
      if ( !keys || !foundry.utils.isEmpty(initial) ) return initial;
      if ( !(keys instanceof Array) ) keys = Object.keys(keys);
      for ( const key of keys ) initial[key] = this._getInitialValueForKey(key);
      return initial;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Get the initial value for the provided key.
     * @param {string} key       Key within the object being built.
     * @param {object} [object]  Any existing mapping data.
     * @returns {*}              Initial value based on provided field type.
     */
    _getInitialValueForKey(key, object) {
      const initial = this.model.getInitialValue();
      return this.initialValue?.(key, initial, object) ?? initial;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _validateType(value, options={}) {
      if ( foundry.utils.getType(value) !== "Object" ) throw new Error("must be an Object");
      const errors = this._validateValues(value, options);
      if ( !foundry.utils.isEmpty(errors) ) throw new foundry.data.fields.ModelValidationError(errors);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Validate each value of the object.
     * @param {object} value     The object to validate.
     * @param {object} options   Validation options.
     * @returns {Object<Error>}  An object of value-specific errors by key.
     */
    _validateValues(value, options) {
      const errors = {};
      for ( const [k, v] of Object.entries(value) ) {
        const error = this.model.validate(v, options);
        if ( error ) errors[k] = error;
      }
      return errors;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    initialize(value, model, options={}) {
      if ( !value ) return value;
      const obj = {};
      const initialKeys = (this.initialKeys instanceof Array) ? this.initialKeys : Object.keys(this.initialKeys ?? {});
      const keys = this.initialKeysOnly ? initialKeys : Object.keys(value);
      for ( const key of keys ) {
        const data = value[key] ?? this._getInitialValueForKey(key, value);
        obj[key] = this.model.initialize(data, model, options);
      }
      return obj;
    }
  
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    _getField(path) {
      if ( path.length === 0 ) return this;
      else if ( path.length === 1 ) return this.model;
      path.shift();
      return this.model._getField(path);
    }
  }