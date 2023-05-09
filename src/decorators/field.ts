import {ZodType} from "zod";
import {UltimateBase} from "../data-structures/UltimateBase";
import {UltimateArray} from "../data-structures/UltimateArray";



export type Field = ScalarField | ArrayField | MapField | ObjectField;
interface ScalarField {
    type: "scalar";
    zodType: ZodType|undefined;
}

interface ObjectField {
    type: "object";
    classObj: { new(): UltimateBase };
}

interface ArrayField {
    type: "array";
    subField: Field;
}

interface MapField {
    type: "map";
    subField: Field;
}

/**
 * A map containing the class name as key and a map of fields of the class as value.
 */
export const fieldsRegistry = new Map</*Constructor<UltimateBase>*/ string, Map<string, Field>>();

export function field(zodType: ZodType|undefined) {
    return function(target: unknown, propertyKey: string) {
        if (!(target instanceof UltimateBase)) {
            throw new Error("The field decorator can only be used on properties of a class extending UltimateBase");
        }

        // FIXME: instead of storing this in "value", we should store it in a private field of the object.
        // This way, when debugging or console.logging the object, we can see the value of properties.
        // We can do this with another "Object.defineProperty" call.
        let value : unknown;
        console.log("COUCOU field", propertyKey, "target:", target.constructor.name)

        let fields = fieldsRegistry.get(target.constructor.name);
        if (fields === undefined) {
            fields = new Map();
            fieldsRegistry.set(target.constructor.name, fields);
        }
        fields.set(propertyKey, {
            type: "scalar",
            zodType
        });

        const getter = function() {
            return this["___"+propertyKey];
        };
        const setter = function(newVal: unknown) {
            //console.log("SETTER ON ", this, this.__getPath(), "for property", propertyKey, "new value", newVal);
            if (!(this instanceof UltimateBase)) {
                console.log("TARGET NOT INSTANCE OF ULTIMATEBASE");
            }
            if (this._disableNotifications) {
                console.log("Notifications disabled")
//                value = newVal;
//                this["___"+propertyKey] = newVal;
                Object.defineProperty(this, "___"+propertyKey, {
                    "configurable": true,
                    "enumerable": true,
                    "writable": false,
                    "value": newVal
                });

                // Constructor not called yet, this is the init step of the object where members are initialized.
                // Let's skip this.
                return;
            }

            /*if (value instanceof UltimateBase) {
                value.__setParent(undefined, undefined);
            }
            if (newVal instanceof UltimateBase) {
                console.log("setParent")
                newVal.__setParent(target, propertyKey);
            }*/

            if (zodType !== undefined) {
                newVal = zodType.parse(newVal);
            }

            this.__notifyFieldSet(propertyKey, newVal);

            //this["___"+propertyKey] = newVal;
            Object.defineProperty(this, "___"+propertyKey, {
                "configurable": true,
                "enumerable": true,
                "writable": false,
                "value": newVal
            });
            //value = newVal;
        };
        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter
        });
    }
    /*return function actualDecorator(originalMethod: any, context: ClassFieldDecoratorContext) =>  {

        const methodName = String(context.name);
        function replacementMethod(this: any, ...args: any[]) {
            console.log(`${headMessage} Entering method '${methodName}'.`)
            const result = originalMethod.call(this, ...args);
            console.log(`${headMessage} Exiting method '${methodName}'.`)
            return result;
        }
        return replacementMethod;
    }*/
}

export function object(classObj: { new(): UltimateBase }) {
    return function(target: UltimateBase, propertyKey: string) {

        //let value : UltimateBase | undefined;
        console.log("COUCOU field", propertyKey, "target:", target.constructor.name)

        let fields = fieldsRegistry.get(target.constructor.name);
        if (fields === undefined) {
            fields = new Map();
            fieldsRegistry.set(target.constructor.name, fields);
        }
        fields.set(propertyKey, {
            type: "object",
            classObj,
        });

        const getter = function() {
            return this["___"+propertyKey];
        };
        const setter = function(newVal: unknown) {
            if (!(newVal instanceof UltimateBase) && newVal !== undefined) {
                throw new Error(`Values set on ${propertyKey}  must be objects extending UltimateBase`);
            }


            if (this._disableNotifications) {
                console.log("Notifications disabled")
                Object.defineProperty(this, "___"+propertyKey, {
                    "configurable": true,
                    "enumerable": true,
                    "writable": false,
                    "value": newVal
                });

                // Notifications have been disabled. Maybe we are initializing the class.
                return;
            }

            const oldVal = this["___"+propertyKey];
            if (oldVal !== undefined) {
                oldVal.__setParent(undefined, undefined);
            }
            if (newVal instanceof UltimateBase) {
                console.log("setParent")
                newVal.__setParent(this, propertyKey);
            }

            this.__notifyFieldSet(propertyKey, newVal);

            //value = newVal;
            Object.defineProperty(this, "___"+propertyKey, {
                "configurable": true,
                "enumerable": true,
                "writable": false,
                "value": newVal
            });
        };
        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter
        });
    }
}

export function arrayOf(subType: { new(): UltimateBase }|ZodType|Field|undefined) {
    return function(target: UltimateBase, propertyKey: string) {
        let normalizedSubfield: Field | undefined;
        if (subType instanceof ZodType || subType === undefined) {
            normalizedSubfield = {
                type: "scalar",
                zodType: subType,
            };
        } else if (typeof subType === 'function') {
            // This is a constructor
            normalizedSubfield = {
                type: "object",
                classObj: subType,
            }
        } else {
            normalizedSubfield = subType;
        }

        let fields = fieldsRegistry.get(target.constructor.name);
        if (fields === undefined) {
            fields = new Map();
            fieldsRegistry.set(target.constructor.name, fields);
        }
        fields.set(propertyKey, {
            type: "array",
            subField: normalizedSubfield,
        });

        const getter = function() {
            return this["___"+propertyKey];
        };
        const setter = function(newVal: unknown) {
            // PROPOSAL: FORBID SETTING AN ARRAY. Or only allow the subtype ResponsiveArray THIS WILL HAVE SIDE EFFECTS. INSTEAD, ONLY ALLOW push, etc...
            // The getter can be used

            if (!(newVal instanceof UltimateArray) && newVal !== undefined) {
                throw new Error(`Values set on ${propertyKey}  must be objects extending UltimateArray`);
            }


            if (this._disableNotifications) {
                console.log("Notifications disabled")
                Object.defineProperty(this, "___"+propertyKey, {
                    "configurable": true,
                    "enumerable": true,
                    "writable": false,
                    "value": newVal
                });

                // Notifications have been disabled. Maybe we are initializing the class.
                return;
            }

            const oldVal = this["___"+propertyKey];
            if (oldVal !== undefined) {
                oldVal.__setParent(undefined, undefined);
            }
            if (newVal instanceof UltimateBase) {
                console.log("setParent")
                newVal.__setParent(this, propertyKey);
            }

            this.__notifyFieldSet(propertyKey, newVal);

            //value = newVal;
            Object.defineProperty(this, "___"+propertyKey, {
                "configurable": true,
                "enumerable": true,
                "writable": false,
                "value": newVal
            });
        };
        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter
        });
    }
}
