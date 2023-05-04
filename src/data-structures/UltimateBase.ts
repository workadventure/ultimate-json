
// These high level types shamelessly borrowed from https://github.com/microsoft/TypeScript/issues/5863#issuecomment-1483978415
import {UltimateArray} from "./UltimateArray";
import {Observable, Subject} from "rxjs";
import {UltimateUtils} from "./UltimateUtils";
import {fieldsRegistry} from "../decorators/field";

export interface PrototypeType<T> extends Function {
    prototype: T;
}

export interface ConstructorFunctionType<T = any> extends PrototypeType<T> {
    new (...args: any[]): T;
}

export type ConstructorType<T = unknown, Static extends Record<string, any> = PrototypeType<T>> = (ConstructorFunctionType<T> | PrototypeType<T>) & {
    [Key in keyof Static]: Static[Key];
};

export class UltimateBase {
    public _disableNotifications = false;

    private parent: UltimateBase | UltimateArray<unknown> | undefined;
    /**
     * If the object is in an array (in the parent field), this is the position in the array.
     */
    private positionInParentArray: number | undefined;
    /**
     * If the object is in a map (in the parent field), this is the key in the map.
     * Note: because this is serializable to JSON, the key is a string.
     */
    private keyInParentMap: string | undefined;
    /**
     * If the object is in a property (in the parent field), this is the property that contains the object.
     */
    private parentProperty: string | undefined;

    private fieldSubscribers: {
        [K in keyof this ]?: Subject<this[K]>;
    } = {};

    /*get __constructorCalled(): boolean {
        return this._constructorCalled;
    }*/

    //public __notifyFieldSet(field: keyof this, value: this[keyof this]) {
    public __notifyFieldSet(field: string, value: unknown) {
        // TODO: we could implement some decorators here (instead of passing the set to the parent stupidly).
        // and it would be more efficient.
        // Each class could decorate the setters; for each decorators, we would have the matching
        console.log("Field set", field, value);
        if (this.fieldSubscribers !== undefined && this.fieldSubscribers[field]) {
            this.fieldSubscribers[field].next(value);
        }
    }

    public onChange<K extends keyof this>(field: K): Observable<this[K]> {
        if (!this.fieldSubscribers[field]) {
            this.fieldSubscribers[field] = new Subject<this[K]>();
        }
        console.log("onChange", field);
        return this.fieldSubscribers[field];
    }

    public __setParent(parent: UltimateBase | undefined, parentProperty: string | undefined): void {
        if (parent !== undefined && this.parent !== undefined) {
            throw new Error("Object already has a parent declared.");
        }
        this.parent = parent;
        this.parentProperty = parentProperty;
    }

    public __setParentArray(parent: UltimateArray<unknown> | undefined, positionInParentArray: number | undefined): void {
        if (parent !== undefined && this.parent !== undefined) {
            throw new Error("Object already has a parent declared.");
        }
        this.parent = parent;
        this.positionInParentArray = positionInParentArray;
    }

    public __getPath(): string[] {
        if (this.parent === undefined) {
            return [];
        }
        const path = this.parent.__getPath();
        let key = this.parentProperty ?? "";
        const offset = this.keyInParentMap ?? this.positionInParentArray;
        if (offset !== undefined) {
            key = key + "[" + offset + "]"
        }
        path.push(key);
        return path;
    }

    public static fromJson<T extends UltimateBase>(this: ConstructorType<T, typeof UltimateBase>, json: object): T {
        // this.name is the name of the class statically called.
        console.log(this,this.name, this.constructor.name);

        const instance = (new this()) as InstanceType<T>;
        instance._disableNotifications = true;
        console.log("fromJson", instance, instance.constructor.name);

        const fields = fieldsRegistry.get(this.name);
        if (fields === undefined) {
            throw new Error("No @field descriptors found for class '" + this.name + "'.");
        }
        for (const [fieldName, fieldDescriptor] of fields) {
            if (json[fieldName] !== undefined) {
                let value = json[fieldName];

                instance[fieldName] = UltimateUtils.fromJsonItem(value, fieldDescriptor);
            }
        }

        instance._disableNotifications = false;
        return instance;
    }
}