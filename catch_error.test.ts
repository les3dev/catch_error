import {expect, test} from "vitest";
import {catch_error} from "./catch_error";

test("Async function examples", async () => {
    const throw_error = async () => {
        throw new Error("simple error");
    };
    const result = await catch_error(() => throw_error());
    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("simple error");
    }

    const check_age = async (age: number) => {
        if (age < 18) {
            throw new Error("🔞");
        }
        return "ok";
    };
    const is_adult = await catch_error(() => check_age(25));
    expect(is_adult).toBe("ok");
    const is_child = await catch_error(() => check_age(16));
    expect(is_child).toBeInstanceOf(Error);
    if (is_child instanceof Error) {
        expect(is_child.message).toBe("🔞");
    }
});

test("Custom error", async () => {
    class SystemError extends Error {
        constructor(
            public level: "unrecoverable" | "retry" | "ignore",
            message: string,
        ) {
            super(message);
            this.name = "SystemError";
        }
    }

    const load_file = async (file_path: string) => {
        throw new SystemError("unrecoverable", `file ${file_path} not found`);
    };

    const error = await catch_error(() => load_file("data.csv"));
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SystemError);
    if (error instanceof SystemError) {
        expect(error.name).toBe("SystemError");
        expect(error.level).toBe("unrecoverable");
    }
});

test("Sync value examples", () => {
    const get_number = () => 42;
    const result = catch_error(get_number);

    expect(result).toBe(42);
});

test("Sync error thrown", () => {
    const throw_error = () => {
        throw new Error("boom");
    };

    const result = catch_error(throw_error);

    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("boom");
    }
});

test("Sync non-error thrown value — string", () => {
    const throw_string = () => {
        throw "oops";
    };

    const result = catch_error(throw_string);

    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("oops");
    }
});

test("Sync non-error thrown value — string prefixed with 'Error: ' is stripped", () => {
    const throw_prefixed_string = () => {
        throw "Error: something went wrong";
    };

    const result = catch_error(throw_prefixed_string);

    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("something went wrong");
    }
});

test("Sync non-error thrown value — object with message property", () => {
    const throw_object = () => {
        throw {message: "looks like an error", code: 42};
    };

    const result = catch_error(throw_object);

    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("looks like an error");
    }
});

test("Sync non-error thrown value — number", () => {
    const throw_number = () => {
        throw 404;
    };

    const result = catch_error(throw_number);

    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("Thrown value of type number that doesn't extends Error: 404");
    }
});

test("Sync non-error thrown value — null", () => {
    const throw_null = () => {
        throw null;
    };

    const result = catch_error(throw_null);

    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("Thrown value of type object that doesn't extends Error: null");
    }
});

test("Sync non-error thrown value — boolean", () => {
    const throw_bool = () => {
        throw false;
    };

    const result = catch_error(throw_bool);

    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("Thrown value of type boolean that doesn't extends Error: false");
    }
});

test("Async function throws synchronously before first await", async () => {
    // This validates the key guarantee: wrapping in a function catches errors
    // that occur before any await, which would escape catch_error(fn()) directly.
    const async_fn = async (value: unknown) => {
        if (value === null) throw new Error("null not allowed"); // throws before any await
        await Promise.resolve();
        return "ok";
    };

    const result = await catch_error(() => async_fn(null));

    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("null not allowed");
    }
});

test("Async function resolves with a non-primitive value", async () => {
    const fetch_config = async () => ({host: "localhost", port: 8080});

    const result = await catch_error(() => fetch_config());

    expect(result).not.toBeInstanceOf(Error);
    if (!(result instanceof Error)) {
        expect(result).toEqual({host: "localhost", port: 8080});
    }
});

test("Function returning a promise", async () => {
    const async_fn = async () => "ok";

    const result = await catch_error(() => async_fn());

    expect(result).toBe("ok");
});

test("Function returning a rejected promise", async () => {
    const async_fn = async () => {
        throw new Error("fail");
    };

    const result = await catch_error(async () => await async_fn());

    expect(result).toBeInstanceOf(Error);
    if (result instanceof Error) {
        expect(result.message).toBe("fail");
    }
});

test("System JS error (ReferenceError)", () => {
    const access_undefined = () => {
        // @ts-expect-error — intentionally accessing an undefined variable
        return not_defined_variable;
    };

    const result = catch_error(access_undefined);

    expect(result).toBeInstanceOf(Error);
    expect(result).toBeInstanceOf(ReferenceError);

    if (result instanceof Error) {
        expect(result.name).toBe("ReferenceError");
        expect(result.message).toBe("not_defined_variable is not defined");
    }
});
