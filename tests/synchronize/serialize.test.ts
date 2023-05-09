import { describe, expect, it } from "vitest";
import {UltimateBase} from "../../src/data-structures/UltimateBase";
import {field, object, fieldsRegistry, arrayOf} from "../../src/decorators/field";
import { z } from "zod";
import exp from "constants";
import {UltimateArray} from "../../src/data-structures/UltimateArray";
import {applyPatch, generatePatch} from "../../src/synchronize/serialize";

describe("Serialize", () => {
    class Test2 extends UltimateBase {
        @field(z.string())
        public foo = "foo";

    }

    class Test1 extends UltimateBase {

        @field(z.number())
        public foo = 2;

        @field(z.number())
        public bar = 3;

        @field(z.string())
        public baz;

        @object(Test2)
        public test: Test2|undefined;

        @arrayOf(Test2)
        public tests: UltimateArray<Test2>;

        @arrayOf(z.string())
        public strings: UltimateArray<string>;
    }

    it("should generate patch", () => {


        const test = Test1.fromJson({
            foo: 30,
            baz: "coucou",
            test: {
                foo: "string",
            },
            tests: [
                {
                    foo: "bar"
                }
            ],
            strings: [
                "foo",
                "bar"
            ]
        });

        test.foo = 40;
        test.baz = "coucou2";
        test.test.foo = "other_string";
        const patches = generatePatch(test);
        expect(patches).toEqual([
            {
                operation: "add",
                path: "foo",
                value: 40,
            },
            {
                operation: "add",
                path: "baz",
                value: "coucou2",
            },
            {
                operation: "modify",
                path: "test",
                patches: [
                    {
                        operation: "add",
                        path: "foo",
                        value: "other_string",
                    }
                ],
            }
        ]);

        // Let's assert the second generation is empty
        const patches2 = generatePatch(test);
        expect(patches2).toEqual([]);

        // Let's modify an object in an array
        test.tests[0].foo = "other_string";
        const patches3 = generatePatch(test);

        expect(patches3).toEqual([
            {
                operation: "modify",
                path: "tests",
                patches: [
                    {
                        operation: "modify",
                        path: 0,
                        patches: [
                            {
                                operation: "add",
                                path: "foo",
                                value: "other_string",
                            }
                        ],
                    }
                ],
            }
        ]);

        // Let's modify a scalar in an array
        test.strings[0] = "other_string";
        const patches4 = generatePatch(test);

        expect(patches4).toEqual([
            {
                operation: "modify",
                path: "strings",
                patches: [
                    {
                        operation: "add",
                        path: 0,
                        value: "other_string",
                    }
                ],
            }
        ]);

        // Let's push an object in an array
        const test2 = new Test2();
        test2.foo = "hello";
        test.tests.push(test2);

        const patches5 = generatePatch(test);

        expect(patches5).toEqual([
            {
                operation: "modify",
                path: "tests",
                patches: [
                    {
                        operation: "add",
                        path: 1,
                        value: {
                            foo: "hello",
                        }
                    }
                ],
            }
        ]);

        // Let's push a scalar in an array
        test.strings.push("hello");

        const patches6 = generatePatch(test);

        expect(patches6).toEqual([
            {
                operation: "modify",
                path: "strings",
                patches: [
                    {
                        operation: "add",
                        path: 2,
                        value: "hello",
                    }
                ],
            }
        ]);
    });

    it("should apply patches", () => {
        const json = {
            foo: 30,
            baz: "coucou",
            test: {
                foo: "string",
            },
            tests: [
                {
                    foo: "bar"
                }
            ],
            strings: [
                "foo",
                "bar"
            ]
        };

        const testSource = Test1.fromJson(json);
        const testDestination = Test1.fromJson(json);

        testSource.foo = 40;
        testSource.baz = "coucou2";
        testSource.test.foo = "other_string";
        testSource.tests[0].foo = "other_string";
        testSource.tests.push(new Test2());
        testSource.strings[0] = "other_string";
        testSource.strings.push("hello");

        const patch = generatePatch(testSource);
        applyPatch(testDestination, patch);

        expect(testDestination.toJson()).toEqual(testSource.toJson());
    });

    it("should accept detaching objects", () => {
        const json = {
            test: {
                foo: "string",
            },
        };

        const test = Test1.fromJson(json);
        const test2 = test.test;

        test.test = undefined;
        const patch = generatePatch(test);
        expect(patch).toEqual([{
            operation: "remove",
            path: "test",
        }]);

        (test2 as Test2).foo = "bar";

        const patch2 = generatePatch(test);
        expect(patch2).toEqual([]);
    });

    it("should accept replacing objects", () => {
        const json = {
            test: {
                foo: "string",
            },
        };

        const test = Test1.fromJson(json);
        const test2 = test.test;

        test.test = new Test2();
        const patch = generatePatch(test);
        expect(patch).toEqual([{
            operation: "add",
            path: "test",
            value: {
                foo: 'foo'
            }
        }]);

        (test2 as Test2).foo = "bar";

        const patch2 = generatePatch(test);
        expect(patch2).toEqual([]);
    });

    it("should track replaced objects", () => {
        const json = {
            test: {
                foo: "string",
            },
        };

        const test = Test1.fromJson(json);

        test.test = new Test2();
        const patch = generatePatch(test);
        expect(patch).toEqual([{
            operation: "add",
            path: "test",
            value: {
                foo: 'foo'
            }
        }]);

        test.test.foo = "bar";

        const patch2 = generatePatch(test);
        expect(patch2).toEqual([{
            operation: "modify",
            path: "test",
            patches: [
                {
                    operation: "add",
                    path: "foo",
                    value: "bar"
                }
            ]
        }]);
    });

    it("should accept detaching objects in arrays", () => {
        const json = {
            tests: [{
                foo: "string",
            }],
        };

        const test = Test1.fromJson(json);
        const test2 = test.tests[0];

        test.tests[0] = undefined;
        const patch = generatePatch(test);
        expect(patch).toEqual([{
            operation: "modify",
            path: "tests",
            patches: [
                {
                    operation: "remove",
                    path: 0,
                }
            ]
        }]);

        (test2 as Test2).foo = "bar";

        const patch2 = generatePatch(test);
        expect(patch2).toEqual([]);
    });

});