# catch_error

A tiny helper inspired by Rust's `Result` type that turns thrown errors into values you can branch on — concise control flow, zero ceremony.

![](./thumbnail.png)

## Why use this

- Avoid try/catch weird control flow
- Forces to handle errors before accessing returned values
- Treat errors as values (like `Result`), so you can use normal control flow to handle them.
- Works with both synchronous functions and promises (returns a promise when given one).

## What it does

The `catch_error` helper runs a sync function or accepts a `Promise` and returns either the successful value or an `Error` instance with a TypeScript union type. Instead of throwing, failures are returned so callers can check `instanceof Error` and handle errors inline.

> See the implementation in [src/index.ts](src/index.ts).

## API

- `catch_error(fn: () => T): T | Error` — runs `fn` and returns either the value or an `Error`.
- `catch_error(async_fn: () => Promise<T>): Promise<T | Error>` — returns a promise that resolves to either the value or an `Error`.
- `normalize_error(err: unknown): Error` — coerces any thrown value into an `Error`; use `normalize_error(err).message` when you only need the message.

Always pass a **function**, never a `Promise` directly: errors thrown before the promise is created would otherwise escape the safety boundary.

Errors that are not `Error` instances are wrapped in a fallback `Error` with a helpful message. `normalize_error` recognises `Error` instances, `{body: {message}}` envelopes (as returned by some http clients), `{message}` objects and strings, before falling back to a generic message.

## Examples

Sync example:

```ts
import {catch_error} from "@les3dev/catch_error";

function parseIntStrict(s: string) {
    if (!/^-?\d+$/.test(s)) throw new Error("not an integer");
    return Number(s);
}

const result = catch_error(() => parseIntStrict("42"));
if (result instanceof Error) {
    // handle error
    console.error("Failed to parse:", result.message);
} else {
    // use value
    console.log("value is", result);
}
```

Async example:

```ts
import {catch_error} from "@les3dev/catch_error";

const valueOrErr = await catch_error(() => fetch_data());
if (valueOrErr instanceof Error) {
    // handle error
    console.error("fetch failed", valueOrErr);
} else {
    console.log("data", valueOrErr);
}
```

Custom error example:

```ts
class NotFoundError extends Error {
    constructor(message: string, body: any) {
        super(message);
        this.name = "NotFoundError";
        this.status = 404;
        this.body = body;
    }
}
const result = await catch_error(async () => {
    const res = await fetch("https://les3.dev/not_found");
    if (res.status === 404) {
        throw NotFoundError("page not found", await res.json());
    }
    return await res.json();
});
if (result instanceof NotFoundError) {
    console.log(result.status, result.message, result.body);
} else if (result instanceof Error) {
    console.log("Unknown error: ", result.message);
} else {
    console.log("Success: ", result);
}
```

> See the tests in [catch_error.test.ts](catch_error.test.ts) for more usage examples
