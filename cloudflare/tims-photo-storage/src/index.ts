const PHOTO_TYPES = new Set([
  "install",
  "vehicle",
  "machineNumber",
  "rearCamera",
  "eps",
  "cpg",
  "acu",
  "version",
]);

const CONTENT_TYPE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
]);

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    try {
      if (request.method === "OPTIONS") {
        return handleOptions(origin, env);
      }

      if (request.method === "GET" && url.pathname === "/health") {
        return jsonResponse({ ok: true, storage: "r2" }, 200, origin, env);
      }

      if (
        (request.method === "GET" || request.method === "HEAD") &&
        url.pathname.startsWith("/photos/")
      ) {
        return servePhoto(request, env, url.pathname.slice("/photos/".length));
      }

      if (request.method === "POST" && url.pathname === "/v1/photos") {
        requireAllowedOrigin(origin, env);
        return uploadPhoto(request, env, origin);
      }

      if (
        request.method === "DELETE" &&
        url.pathname.startsWith("/v1/photos/")
      ) {
        requireAllowedOrigin(origin, env);
        return deletePhoto(
          request,
          env,
          origin,
          url.pathname.slice("/v1/photos/".length),
        );
      }

      return jsonResponse({ error: "Not found" }, 404, origin, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = error instanceof HttpError ? error.status : 500;

      console.error(JSON.stringify({
        message: "photo storage request failed",
        method: request.method,
        path: url.pathname,
        status,
        error: message,
      }));

      return jsonResponse(
        { error: status === 500 ? "Internal server error" : message },
        status,
        origin,
        env,
      );
    }
  },
} satisfies ExportedHandler<Env>;

async function uploadPhoto(
  request: Request,
  env: Env,
  origin: string | null,
): Promise<Response> {
  const recordId = request.headers.get("X-Record-Id")?.trim() || "";
  const photoType = request.headers.get("X-Photo-Type")?.trim() || "";
  const originalName = request.headers.get("X-File-Name")?.trim() || "photo";
  const contentType = normalizeContentType(request.headers.get("Content-Type"));
  const contentLength = Number(request.headers.get("Content-Length"));
  const maxUploadBytes = getMaxUploadBytes(env);

  if (!/^[0-9a-z-]{8,64}$/i.test(recordId)) {
    throw new HttpError(400, "Invalid record ID");
  }
  if (!PHOTO_TYPES.has(photoType)) {
    throw new HttpError(400, "Invalid photo type");
  }
  if (!CONTENT_TYPE_EXTENSIONS.has(contentType)) {
    throw new HttpError(415, "Unsupported image type");
  }
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw new HttpError(411, "Content-Length is required");
  }
  if (contentLength > maxUploadBytes) {
    throw new HttpError(413, "Image exceeds the maximum upload size");
  }
  if (!request.body) {
    throw new HttpError(400, "Image body is required");
  }

  const extension = CONTENT_TYPE_EXTENSIONS.get(contentType);
  const key = `${recordId}/${photoType}_${Date.now()}_${crypto.randomUUID()}.${extension}`;
  const deleteToken = createToken();
  const deleteTokenHash = await sha256Hex(deleteToken);

  const object = await env.PHOTOS.put(key, request.body, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      recordId,
      photoType,
      originalName: sanitizeMetadata(originalName),
      deleteTokenHash,
    },
  });

  if (object.size > maxUploadBytes) {
    await env.PHOTOS.delete(key);
    throw new HttpError(413, "Image exceeds the maximum upload size");
  }

  const publicUrl = new URL(`/photos/${key}`, request.url).toString();

  console.log(JSON.stringify({
    message: "photo uploaded",
    key,
    size: object.size,
    photoType,
  }));

  return jsonResponse({
    storageProvider: "r2",
    photoPath: key,
    photoUrl: publicUrl,
    deleteToken,
    size: object.size,
  }, 201, origin, env);
}

async function servePhoto(
  request: Request,
  env: Env,
  rawKey: string,
): Promise<Response> {
  const key = normalizeObjectKey(rawKey);

  if (request.method === "HEAD") {
    const object = await env.PHOTOS.head(key);
    if (!object) return new Response(null, { status: 404 });

    const headers = photoHeaders(object);
    headers.set("Content-Length", String(object.size));
    return new Response(null, { status: 200, headers });
  }

  const object = await env.PHOTOS.get(key, {
    onlyIf: request.headers,
    range: request.headers,
  });
  if (!object) return new Response("Object not found", { status: 404 });
  if (!("body" in object)) {
    return new Response(null, { status: 304, headers: photoHeaders(object) });
  }

  const headers = photoHeaders(object);
  if (object.range) {
    const offset = "offset" in object.range ? object.range.offset || 0 : 0;
    const length = "length" in object.range ? object.range.length : undefined;
    if (typeof length === "number") {
      headers.set(
        "Content-Range",
        `bytes ${offset}-${offset + length - 1}/${object.size}`,
      );
      headers.set("Content-Length", String(length));
      return new Response(object.body, { status: 206, headers });
    }
  }

  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}

async function deletePhoto(
  request: Request,
  env: Env,
  origin: string | null,
  rawKey: string,
): Promise<Response> {
  const key = normalizeObjectKey(rawKey);
  const deleteToken = request.headers.get("X-Delete-Token") || "";
  const object = await env.PHOTOS.head(key);

  if (!object) {
    return jsonResponse({ deleted: true }, 200, origin, env);
  }

  const expectedHash = object.customMetadata?.deleteTokenHash || "";
  if (!(await verifyDeleteToken(deleteToken, expectedHash))) {
    throw new HttpError(403, "Invalid delete token");
  }

  await env.PHOTOS.delete(key);
  console.log(JSON.stringify({ message: "photo deleted", key }));
  return jsonResponse({ deleted: true }, 200, origin, env);
}

function photoHeaders(object: R2Object): Headers {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("X-Content-Type-Options", "nosniff");
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return headers;
}

function handleOptions(origin: string | null, env: Env): Response {
  requireAllowedOrigin(origin, env);
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, env),
  });
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  env: Env,
): Response {
  const headers = corsHeaders(origin, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
}

function corsHeaders(origin: string | null, env: Env): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, HEAD, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Content-Length, X-Record-Id, X-Photo-Type, X-File-Name, X-Delete-Token",
    "Access-Control-Max-Age": "7200",
    "Vary": "Origin",
  });

  if (origin && allowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function requireAllowedOrigin(origin: string | null, env: Env): void {
  if (!origin || !allowedOrigins(env).has(origin)) {
    throw new HttpError(403, "Origin is not allowed");
  }
}

function allowedOrigins(env: Env): Set<string> {
  return new Set(
    env.ALLOWED_ORIGINS.split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function getMaxUploadBytes(env: Env): number {
  const value = Number(env.MAX_UPLOAD_BYTES);
  return Number.isFinite(value) && value > 0 ? value : 5 * 1024 * 1024;
}

function normalizeContentType(value: string | null): string {
  return String(value || "").split(";", 1)[0].trim().toLowerCase();
}

function normalizeObjectKey(value: string): string {
  let key = "";
  try {
    key = decodeURIComponent(value);
  } catch {
    throw new HttpError(400, "Invalid object key");
  }

  if (
    !key ||
    key.length > 512 ||
    key.startsWith("/") ||
    key.includes("..") ||
    !/^[0-9a-z/_ .-]+$/i.test(key)
  ) {
    throw new HttpError(400, "Invalid object key");
  }
  return key;
}

function sanitizeMetadata(value: string): string {
  return value.replace(/[\r\n\0]/g, " ").slice(0, 180);
}

function createToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function verifyDeleteToken(
  providedToken: string,
  expectedHashHex: string,
): Promise<boolean> {
  const providedHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(providedToken)),
  );
  const expectedHash = hexToBytes(expectedHashHex) || new Uint8Array(32);
  const matches = crypto.subtle.timingSafeEqual(providedHash, expectedHash);
  return expectedHashHex.length === 64 && matches;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
