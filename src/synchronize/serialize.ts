import {UltimateBase} from "../data-structures/UltimateBase";
import {UltimateArray} from "../data-structures/UltimateArray";
import {fieldsRegistry} from "../decorators/field";

type AddPatch = {
    operation: "add";
    path: string|number;
    value?: unknown;
}

type RemovePatch = {
    operation: "remove";
    path: string|number;
}

type ModifyPatch = {
    operation: "modify";
    path: string|number;
    patches: Patch[];
}

type Patch = AddPatch | RemovePatch | ModifyPatch;

export function generatePatch(ultimateObj: UltimateBase|UltimateArray<unknown>): Patch[]  {
    const patches: Patch[] = [];
    const dirtyFields = ultimateObj.getDirtyFields(true);

    for (const field of dirtyFields) {
        const value = ultimateObj[field];
        if (value === undefined) {
            patches.push({
                operation: "remove",
                path: field,
            });
        } else {
            patches.push({
                operation: "add",
                path: field,
                value: (value instanceof UltimateBase || value instanceof UltimateArray) ? value.toJson() : value,
            });
        }
    }

    const dirtyChildFields = ultimateObj.getDirtyChildFields(true);

    for (const field of dirtyChildFields) {
        const value = ultimateObj[field];
        if (value instanceof UltimateBase || value instanceof UltimateArray) {
            patches.push({
                operation: "modify",
                path: field,
                patches: generatePatch(value),
            });
        } else {
            throw new Error("Unknown child");
        }
    }

    return patches;
}

export function applyPatch(ultimateObj: UltimateBase|UltimateArray<unknown>, patches: Patch[]): void {
    for (const patch of patches) {
        let field;
        if (ultimateObj instanceof UltimateBase) {
            field = fieldsRegistry.get(ultimateObj.constructor.name)?.get(patch.path as string);
            if (field === undefined) {
                throw new Error("Invalid patch, unknown field: '" + patch.path + "' for class '" + ultimateObj.constructor.name +"'.");
            }
        } else if (ultimateObj instanceof UltimateArray) {
            field = ultimateObj.__getFieldDescriptor();
        }
        switch (patch.operation) {
            case "add":
                switch (field.type) {
                    case "scalar": {
                        ultimateObj[patch.path] = patch.value;
                        break;
                    }
                    case "object": {
                        if (typeof patch.value === "object") {
                            ultimateObj[patch.path] = field.classObj.fromJson(patch.value);
                        } else {
                            ultimateObj[patch.path] = patch.value;
                        }
                        break;
                    }
                    case "array": {
                        if (!Array.isArray(patch.value)) {
                            throw new Error("Invalid patch, expected array for field '" + patch.path + "' for class '" + ultimateObj.constructor.name +"'.");
                        }
                        ultimateObj[patch.path] = UltimateArray.fromJson(patch.value, field.subField);
                        break;
                    }
                    case "map": {
                        throw new Error("Not implemented");
                    }
                    default: {
                        const _exhaustiveCheck: never = field;
                        throw new Error("Unknown field type");
                    }
                }

                break;
            case "remove":
                // TODO: should we splice here in case of array?
                delete ultimateObj[patch.path];
                break;
            case "modify":
                applyPatch(ultimateObj[patch.path], patch.patches);
                break;
            default: {
                const _exhaustiveCheck: never = patch;
                throw new Error("Unknown patch type");
            }
        }
    }
}