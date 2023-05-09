import {Field} from "../decorators/field";
import {UltimateArray} from "./UltimateArray";
import {UltimateBase} from "./UltimateBase";

export class UltimateUtils {
    public static fromJsonItem(item: unknown, field: Field, parent: UltimateBase | UltimateArray<unknown> | undefined, parentProperty: string | undefined): unknown {
        switch (field.type) {
            case "scalar": {
                return item;
            }
            case "object": {
                const obj = field.classObj.fromJson(item);
                if (parent instanceof UltimateBase) {
                    obj.__setParent(parent, parentProperty);
                }
                return obj;
            }
            case "array": {
                if (!item instanceof Array) {
                    throw new Error("Expected an array. Got '" + typeof item + "' instead.");
                }
                const arr = UltimateArray.fromJson<unknown>(item, field.subField);
                if (parent instanceof UltimateBase) {
                    arr.__setParent(parent, parentProperty);
                }
                return arr;
            }
            case "map": {
                throw new Error("Not implemented yet");
            }
            default: {
                const _exhaustiveCheck: never = field;
            }
        }

    }

    public static toJsonItem(item: unknown, field: Field): unknown {
        switch (field.type) {
            case "scalar": {
                return item;
            }
            case "object": {
                return (item as UltimateBase).toJson();
            }
            case "array": {
                return (item as UltimateArray<unknown>).toJson();
            }
            case "map": {
                throw new Error("Not implemented yet");
            }
            default: {
                const _exhaustiveCheck: never = field;
            }
        }
    }
}