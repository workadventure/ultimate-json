import { defineConfig } from "vitest/config"; // eslint-disable-line import/no-unresolved

export default defineConfig({
    test: {
        coverage: {
            all: true,
            reporter: ['text', 'html'],
            include: ["src/*.ts", "src/**/*.ts"],
        },
    },
});
