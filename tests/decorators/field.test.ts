import { describe, expect, it } from "vitest";
import {UltimateBase} from "../../src/data-structures/UltimateBase";
import {field, object, fieldsRegistry} from "../../src/decorators/field";
import {z} from "zod";

describe("Field Decorator", () => {
    it("should test", () => {

        class Test2 extends UltimateBase {
            @field(z.string())
            public foo = "foo";

        }

        class Test1 extends UltimateBase {

            constructor() {
                console.log("Constructor called 0");
                super();
                console.log("Constructor called 2", this._disableNotifications);
            }


            @field(z.number())
            public foo = 2;

            @field(z.number())
            public bar = 3;

            @field(z.string())
            public baz;

            @object(Test2)
            public test: Test2;

            /*@arrayOf(Test2)
            public tests: Test2[] = [];

            @arrayOf(z.string)
            public strings: string[] = [];*/
        }

        console.log(fieldsRegistry);

        const test = Test1.fromJson({
            foo: 30,
            baz: "coucou",
            test: {
                foo: "string",
            }
        });

        let onChangeNewValue: number | undefined;
        test.onChange("foo").subscribe(value => { onChangeNewValue = value; });

        expect(onChangeNewValue).toBe(undefined);

        test.foo = 40;
        test.test.foo = "hello";
        expect(onChangeNewValue).toBe(40);
        expect(test.foo).toBe(40);
        expect(test.test.foo).toBe("hello");
        console.log(test);
        console.log("New foo", test.foo);

        /*const test1 = new Test1();
        test1.foo = 30;*/
        /*test1.test = new Test1();
       test1.test.test = new Test1();

        test1.foo = 30;
        console.log(test1.errors);
        console.log(test1.test.test.__getPath());*/
    });
});