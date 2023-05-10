import {Observable, Subject} from "rxjs";
import {UltimateBase} from "./UltimateBase";
import {Field} from "../decorators/field";
import {UltimateUtils} from "./UltimateUtils";

/**
 * The UltimateArray class is a "reactive" version of the Array class.
 * It can be used to listen to any changes made to the array.
 * Also, it has a parent since it has a position in the tree.
 */
export class UltimateArray<V> extends Array<V> {
    // Notifications are enabled only when the object is constructed from "fromJson"
    public _disableNotifications = true;

    private parent: UltimateBase | UltimateArray<unknown> | undefined;
    /**
     * If the object is in an array (in the parent field), this is the position in the array.
     */
    //private positionInParentArray: number | undefined;
    /**
     * If the object is in a map (in the parent field), this is the key in the map.
     * Note: because this is serializable to JSON, the key is a string.
     */
    //private keyInParentMap: string | undefined;
    /**
     * If the object is in a property (in the parent field), this is the property that contains the object.
     */
    private parentProperty: string | undefined;

    /**
     * If the array contains UltimateBase objects, each object is unique in the array.
     * We maintain a Map mapping objects to keys (to find the key of the object in O(1)).
     */
    private reverseMap: Map<V, number> = new Map<V, number>();

    private __dirtyFields: Set<number> = new Set<number>();
    private __dirtyChildFields: Set<V> = new Set<V>();

    public getDirtyFields(cleanFields = false): Set<number> {
        const dirtyFields = this.__dirtyFields;
        if (cleanFields) {
            this.__dirtyFields = new Set<number>();
        }
        return dirtyFields;
    }

    constructor(private field: Field) {
        super();
        const proxy = new Proxy(this, this.createHandler());
        return proxy;
    }


    private createHandler(): ProxyHandler<UltimateArray<V>> {
        return {
            set: (target: UltimateArray<V>, key: string | symbol, value: unknown): boolean => {
                if (key === "length") {
                    // Special case: if we set the length to a value lower than the current length, we need to do is if items are deleted.
                    const oldLength = this.length;
                    if (value < oldLength && !this._disableNotifications) {
                        for (let i = value; i < oldLength; i++) {
                            this.deleteSubject.next(i);
                        }
                    }
                    if (typeof value !== "number") {
                        throw new Error("Array length must be a number.");
                    }
                    return Reflect.set(target, key, value);
                }

                const isNumber = /^\d+$/.test(key.toString());
                if (isNumber) {
                    if (this.field.type === "object" || this.field.type === "array" || this.field.type === "map") {
                        const oldValue = target[key];
                        if (oldValue instanceof UltimateBase || oldValue instanceof UltimateArray) {
                            oldValue.__setParent(undefined, undefined);
                            this.reverseMap.delete(oldValue);
                        }
                    }
                    this.handleItem(value, Number(key));
                }
                const result = Reflect.set(target, key, value);
                if (isNumber && !this._disableNotifications) {
                    this.insertSubject.next(Number(key));
                    this.__dirtyFields.add(Number(key));
                    this.notifyParent();
                }
                return result;
            },
            deleteProperty: (target: UltimateArray<V>, key: string | symbol): boolean => {
                if (this.field.type === "object") {
                    const oldValue = Reflect.get(target, key);
                    if (oldValue instanceof UltimateBase || oldValue instanceof UltimateArray) {
                        oldValue.__setParent(undefined, undefined);
                        this.reverseMap.delete(oldValue as V);
                    }
                } else if (this.field.type === "array") {
                    // TODO
                }

                const result = Reflect.deleteProperty(target, key);
                const isNumber = /^\d+$/.test(key.toString());
                if (isNumber && !this._disableNotifications) {
                    // Note: deleting a property could actually be seen as INSERTING undefined.
                    // This way, the deleteSubject event can be kept for things that are trigerring renumbering in the array.
                    this.deleteSubject.next(Number(key));
                    this.__dirtyFields.add(Number(key));
                    this.notifyParent();
                }
                return result;
            },
        };
    }

    public __setParent(parent: UltimateBase | undefined, parentProperty: string | undefined): void {
        if (parent !== undefined && this.parent !== undefined) {
            throw new Error("Object already has a parent declared.");
        }
        this.parent = parent;
        this.parentProperty = parentProperty;
    }

    public __setParentArray(parent: UltimateArray<unknown> | undefined/*, positionInParentArray: number | undefined*/): void {
        if (parent !== undefined && this.parent !== undefined) {
            throw new Error("Object already has a parent declared.");
        }
        this.parent = parent;
        //this.positionInParentArray = positionInParentArray;
    }

    public __getPath(): string[] {
        if (this.parent === undefined) {
            return [];
        }
        const path = this.parent.__getPath();
        let key = this.parentProperty ?? "";
        const offset = this.keyInParentMap ?? this.positionInParentArray;
        if (offset !== undefined) {
            key = key + "[" + offset + "]";
        }
        path.push(key);
        return path;
    }


    private insertSubject: Subject<number> = new Subject<number>();
    private deleteSubject: Subject<number> = new Subject<number>();

    public onInsert(): Observable<number> {
        return this.insertSubject.asObservable();
    }

    public onDelete(): Observable<number> {
        return this.deleteSubject.asObservable();
    }

    shift(): V | undefined {
        const item = super.shift();
        if (item !== undefined) {
            this.deleteSubject.next(0);
        }
        // Let's renumber the items
        for (let i = 0; i < this.length; i++) {
            // TODO: decrease position in parent array
            // Note: rather than renumbering, we could keep a Map inside the UltimateArray mapping the object to the index! (a kind of reverse array)
            // Or maybe we don't need numbers at all if the event sent provides it?
        }
        return item;
    }
    // TODO: code unshift

    // Note: push is calling "Proxy.set" under the hood. No need to overwrite it.
    /*push(...items: V[]): number {
        const oldLength = this.length;

        for (let i = 0; i < items.length; i++) {
            this.handleItem(items[i + oldLength], i);
        }

        const number = super.push(...items);

        for (let i = oldLength; i < this.length; i++) {
            this.insertSubject.next(i);
        }

        return number;
    }*/

    private handleItem(item: V, index: number) : V {
        switch (this.field.type) {
            case "object": {
                if (item instanceof UltimateBase || item instanceof UltimateArray) {
                    item.__setParentArray(this);
                    this.reverseMap.set(item, index);
                }
                return item;
            }
            case "scalar": {
                if (this.field.zodType) {
                    this.field.zodType.parse(item);
                }
                return item;
            }
            case "array": {
                throw new Error("Not implemented yet");
            }
            case "map": {
                throw new Error("Not implemented yet");
            }
            default: {
                const _exhaustiveCheck: never = this.field;
            }
        }
    }

    static fromJson<Value>(values: Array<Value>, subField: Field): UltimateArray<Value> {
        const array = new UltimateArray<Value>(subField);

        const toPushValues = values.map(item => UltimateUtils.fromJsonItem(item, subField, array, undefined));
        array.push(...toPushValues);

        array._disableNotifications = false;
        return array;
    }

    public toJson(): Array<unknown> {
        const array = [];
        for (const item of this) {
            array.push(UltimateUtils.toJsonItem(item, this.field));
        }
        return array;
    }

    public __notifyChildSet(object: V) {
        this.__dirtyChildFields.add(object);
        this.notifyParent();
    }

    private notifyParent() {
        if (this.parent !== undefined) {
            if (this.parent instanceof UltimateBase) {
                if (!this.parentProperty) {
                    throw new Error("Missing parent property of parent object");
                }
                this.parent.__notifyChildSet(this.parentProperty);
            } else if (this.parent instanceof UltimateArray<unknown>) {
                this.parent.__notifyChildSet(this);
            } else {
                const _exhaustiveCheck: never = this.parent;
                throw new Error("Unknown parent type");
            }
        }
    }

    /**
     * Returns the fields that are objects/arrays that have children that have been modified.
     * @param cleanFields If true, the dirty fields are cleared.
     */
    public getDirtyChildFields(cleanFields = false): Set<number> {
        const dirtySet = new Set<number>();
        for (const alteredItem of this.__dirtyChildFields) {
            const index = this.reverseMap.get(alteredItem);
            if (index === undefined) {
                throw new Error("Could not find index of altered item");
            }
            dirtySet.add(index);
        }
        if (cleanFields) {
            this.__dirtyChildFields = new Set<V>();
        }
        return dirtySet;
    }

    public __getFieldDescriptor(): Field {
        return this.field;
    }
}