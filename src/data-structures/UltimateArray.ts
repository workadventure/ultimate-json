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

    constructor(private field: Field) {
        super();
        const proxy = new Proxy(this, this.createHandler());
        return proxy;
    }


    private createHandler(): ProxyHandler<UltimateArray<V>> {
        return {
            set: (target: UltimateArray<V>, key: string | symbol, value: any): boolean => {
                if (Number.isInteger(key)) {
                    this.handleItem(value, Number(key));
                }
                const result = Reflect.set(target, key, value);
                if (Number.isInteger(key)) {
                    this.insertSubject.next(Number(key));
                }
                return result;
            },
            deleteProperty: (target: UltimateArray<V>, key: string | symbol): boolean => {
                const result = Reflect.deleteProperty(target, key);
                if (Number.isInteger(key)) {
                    this.deleteSubject.next(Number(key));
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


    private insertSubject: Subject<number> = new Subject<number>();
    private deleteSubject: Subject<number> = new Subject<number>();

    public onInsert(): Observable<number> {
        return this.insertSubject.asObservable();
    }

    public onDelete(): Observable<number> {
        return this.deleteSubject.asObservable();
    }

    push(...items: V[]): number {
        const oldLength = this.length;

        for (let i = oldLength; i < this.length; i++) {
            this.handleItem(items[i - oldLength], i);
        }

        const number = super.push(...items);

        for (let i = oldLength; i < this.length; i++) {
            this.insertSubject.next(i);
        }

        return number;
    }

    private handleItem(item: V, index: number) : V {
        switch (this.field.type) {
            case "object": {
                if (item instanceof UltimateBase || item instanceof UltimateArray) {
                    item.__setParentArray(this, index);
                }
                return item;
            }
            case "scalar": {
                if (this.field.zodType) {
                    this.field.zodType.parse(this[i]);
                }
                return item;
            }
            case "array": {
                throw new Error('Not implemented yet');
            }
            case "map": {
                throw new Error('Not implemented yet');
            }
            default: {
                const _exhaustiveCheck: never = this.field;
            }
        }
    }

    static fromJson<Value>(values: Array<Value>, subField: Field): UltimateArray<Value> {
        const array = new UltimateArray<Value>(subField);

        const toPushValues = values.map(item => UltimateUtils.fromJsonItem(item, subField));
        array.push(toPushValues);

        return array;
    }
}