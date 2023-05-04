import {Field} from "../decorators/field";
import {UltimateArray} from "./UltimateArray";

export class UltimateUtils {
    public static fromJsonItem(item: unknown, field: Field) {
        switch (field.type) {
            case "scalar": {
                return item;
            }
            case "object": {
                return field.classObj.fromJson(item);
            }
            case "array": {
                if (!item instanceof Array) {
                    throw new Error("Expected an array. Got '" + typeof item + "' instead.");
                }
                return UltimateArray.fromJson<unknown>(item, field.subField);
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