import type { paths } from './types.gen';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** The JSON body of a 200/201 response for a contract operation. */
export type ResponseOf<P extends keyof paths, M extends Method> = paths[P][M] extends {
  responses: infer R;
}
  ? R extends { 200: { content: { 'application/json': infer J } } }
    ? J
    : R extends { 201: { content: { 'application/json': infer J } } }
      ? J
      : never
  : never;

/** The JSON request body of a contract operation. */
export type BodyOf<P extends keyof paths, M extends Method> = paths[P][M] extends {
  requestBody?: { content: { 'application/json': infer B } };
}
  ? B
  : never;
