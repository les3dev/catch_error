/**
 * Safely executes a function (sync or async), returning either the resolved value or the caught
 * error, but never throws.
 *
 * By requiring a wrapper function, all errors are captured: both synchronous throws that occur
 * before a Promise is created, and async rejections.
 *
 * Non-Error thrown values (strings, plain objects, etc.) are normalised into proper `Error`
 * instances by an internal fallback, so the error branch is always typed as `Error`.
 *
 * @template T The success type returned or resolved by the input function.
 *
 * @param fn - A function to execute safely. Either:
 *   - A **sync function** `() => T`: thrown errors are caught and returned.
 *   - An **async function** `() => Promise<T>`: rejections are caught and returned.
 *
 * ⚠️ Never pass a `Promise` directly, instead pass a function that returns one.
 * Errors thrown before the Promise is created would otherwise escape the safety boundary.
 *
 * @returns
 *   - `T | Error` when `fn` returns synchronously (no `await` needed on the call site).
 *   - `Promise<T | Error>` when `fn` returns a Promise.
 *
 * ---
 *
 * @example <caption>Sync function</caption>
 * ```ts
 * const result = catch_error(() => JSON.parse(raw));
 * if (result instanceof Error) {
 *     return handle_error(result); // result: Error
 * }
 * console.log(result); // result: ReturnType<typeof JSON.parse>
 * ```
 *
 * @example <caption>Async function</caption>
 * ```ts
 * const user = await catch_error(() => fetch_user(id));
 * if (user instanceof Error) {
 *     return handle_error(user); // user: Error
 * }
 * console.log(user.name); // user: User
 * ```
 *
 * @example <caption>Custom error subclass: narrow before the base Error check</caption>
 * ```ts
 * const tokens = await catch_error(() => stream_data());
 * if (tokens instanceof StreamingError) {
 *     return tokens.partial_tokens; // tokens: StreamingError (custom properties available)
 * }
 * if (tokens instanceof Error) {
 *     return handle_error(tokens); // tokens: Error
 * }
 * console.log(tokens); // tokens: Token[]
 * ```
 */
export function catch_error<T>(async_fn: () => Promise<T>): Promise<T | Error>;
export function catch_error<T>(fn: () => T): T | Error;
export function catch_error(input: unknown): unknown {
    try {
        if (typeof input === "function") {
            const result = (input as () => unknown)();
            if (result instanceof Promise) {
                return result.catch(normalize_error);
            }
            return result;
        }
        throw Error(`Unexpected input ${input} of type ${typeof input}`);
    } catch (err) {
        return normalize_error(err);
    }
}

/**
 * Coerces any thrown value into an `Error`, trying common shapes before falling back to a generic message.
 * Handles: `Error` instances, `{ body: { message } }`, `{ message }`, strings, and unknown types.
 */
export const normalize_error = (err: unknown): Error => {
    if (err instanceof Error) {
        // is already an error
        return err;
    }
    if (err !== null && typeof err === "object") {
        if ("body" in err && err.body !== null && typeof err.body === "object" && "message" in err.body && typeof err.body.message === "string") {
            // is an error envelope, as returned by some http clients
            return new Error(err.body.message);
        }
        if ("message" in err && typeof err.message === "string") {
            // is an object that looks like an error but doesnt extends Error
            return new Error(err.message);
        }
    }
    if (typeof err === "string") {
        // is directly a string
        return new Error(err.startsWith("Error: ") ? err.slice("Error: ".length) : err);
    }
    // final fallback with explicit message
    return new Error(`Thrown value of type ${typeof err} that doesn't extend Error: ${err}`);
};
