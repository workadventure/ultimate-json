import {describe, expect, it} from "vitest";
import {UltimateArray} from "../../src/data-structures/UltimateArray";
import {z} from "zod";
import {UltimateBase} from "../../src/data-structures/UltimateBase";
import {field} from "../../src/decorators/field";

describe("UltimateArray", () => {
    it("should push items to the array", () => {
        const arr = new UltimateArray<number>({ type: "scalar", zodType: z.number() });
        const insertedIndexes: number[] = [];
        arr.onInsert().subscribe(index => {
            insertedIndexes.push(index);
        });
        arr.push(1, 2, 3);
        expect(arr.length).toBe(3);
        expect(arr[0]).toBe(1);
        expect(arr[1]).toBe(2);
        expect(arr[2]).toBe(3);
        expect(insertedIndexes).toEqual([0, 1, 2]);
    });

    it("should add items", () => {
        const arr = new UltimateArray<number>({ type: "scalar", zodType: z.number() });
        const insertedIndexes: number[] = [];
        arr.onInsert().subscribe(index => {
            insertedIndexes.push(index);
        });
        arr[0] = 1;
        expect(arr.length).toBe(1);
        expect(arr[0]).toBe(1);
        expect(insertedIndexes).toEqual([0]);
    });

    it("should remove items", () => {
        const arr = new UltimateArray<number>({ type: "scalar", zodType: z.number() });
        let deletedIndexes: number[] = [];
        arr.onDelete().subscribe(index => {
            deletedIndexes.push(index);
        });
        arr[0] = 1;
        delete arr[0];
        expect(deletedIndexes).toEqual([0]);

        deletedIndexes = [];
        arr[0] = 1;
        // Setting the length to 0 will delete all items
        arr.length = 0;
        expect(deletedIndexes).toEqual([0]);
    });

    it("should create array using fromJson", () => {
        const arr = UltimateArray.fromJson([1, 2, 3], { type: "scalar", zodType: z.number() });
        expect(arr.length).toBe(3);
        expect(arr[0]).toBe(1);
        expect(arr[1]).toBe(2);
        expect(arr[2]).toBe(3);
    });

    it("should create array using fromJson and attach to objects", () => {
        class Test extends UltimateBase {
            @field(z.number())
            public foo;
        }

        const arr = UltimateArray.fromJson([{
            foo: 20
        }], { type: "object", classObj: Test });
        expect(arr.length).toBe(1);
        expect(arr[0] instanceof Test).toBe(true);
        expect(arr[0].foo).toBe(20);
    });

});