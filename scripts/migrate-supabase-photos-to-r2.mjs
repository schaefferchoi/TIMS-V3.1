import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUCKET = "install-photos";
const WORKER_URL = "https://tims-photo-storage.tims-tymict.workers.dev";
const STATE_DIR = path.join(ROOT, ".migration");
const BACKUP_DIR = path.join(ROOT, "migration-backups");
const MANIFEST_PATH = path.join(STATE_DIR, "r2-photo-migration.jsonl");
const MODE = process.argv[2] || "status";

const configSource = await readFile(path.join(ROOT, "supabase.js"), "utf8");
const supabaseUrl = matchConfig(configSource, "SUPABASE_URL");
const supabaseKey = matchConfig(configSource, "SUPABASE_ANON_KEY");
const apiHeaders = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`
};

await mkdir(STATE_DIR, { recursive: true });
await mkdir(BACKUP_DIR, { recursive: true });

const rows = await listPhotoRows();
const objects = await listAllStorageObjects();
const objectByPath = new Map(objects.map(object => [object.name, object]));
const referencedPaths = new Set(
    rows
        .filter(row => (row.storage_provider || "supabase") === "supabase")
        .map(row => row.photo_path)
        .filter(Boolean)
);
const orphans = objects.filter(object => !referencedPaths.has(object.name));
const manifest = await readManifest();

if (MODE === "status") {
    printStatus();
} else if (MODE === "backup") {
    await backupInventories();
} else if (MODE === "copy") {
    await copyReferencedPhotos();
} else if (MODE === "verify") {
    await verifyCopiedPhotos(true);
} else if (MODE === "sample-hash") {
    await verifySampleHashes();
} else if (MODE === "update-db") {
    await updateDatabaseRows();
} else if (MODE === "delete-source") {
    await deleteMigratedSources();
} else if (MODE === "delete-orphans") {
    await deleteOrphans();
} else {
    throw new Error(
        "Usage: node scripts/migrate-supabase-photos-to-r2.mjs " +
        "<status|backup|copy|verify|sample-hash|update-db|delete-source|delete-orphans>"
    );
}

function matchConfig(source, name) {
    const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*["']([^"']+)["']`));
    if (!match) throw new Error(`${name} 값을 supabase.js에서 찾지 못했습니다.`);
    return match[1];
}

async function listPhotoRows() {
    const result = [];
    const pageSize = 1000;

    for (let offset = 0; ; offset += pageSize) {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/install_photos?select=id,record_id,photo_type,photo_path,photo_url,storage_provider,storage_delete_token&order=created_at.asc`,
            {
                headers: {
                    ...apiHeaders,
                    Range: `${offset}-${offset + pageSize - 1}`
                }
            }
        );
        await assertOk(response, "사진 메타데이터 조회");
        const page = await response.json();
        result.push(...page);
        if (page.length < pageSize) break;
    }
    return result;
}

async function listAllStorageObjects() {
    const result = [];
    const queue = [""];

    while (queue.length > 0) {
        const prefix = queue.shift();
        for (let offset = 0; ; offset += 100) {
            const response = await fetch(
                `${supabaseUrl}/storage/v1/object/list/${BUCKET}`,
                {
                    method: "POST",
                    headers: {
                        ...apiHeaders,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        prefix,
                        limit: 100,
                        offset,
                        sortBy: { column: "name", order: "asc" }
                    })
                }
            );
            await assertOk(response, `Storage 목록 조회 (${prefix || "/"})`);
            const page = await response.json();

            for (const item of page) {
                const fullName = prefix ? `${prefix}/${item.name}` : item.name;
                if (item.id && item.metadata) {
                    result.push({
                        name: fullName,
                        size: Number(item.metadata.size || 0),
                        mimetype: item.metadata.mimetype || "",
                        created_at: item.created_at || null
                    });
                } else if (item.name) {
                    queue.push(fullName);
                }
            }
            if (page.length < 100) break;
        }
    }
    return result;
}

async function readManifest() {
    try {
        const content = await readFile(MANIFEST_PATH, "utf8");
        const entries = content
            .split("\n")
            .filter(Boolean)
            .map(line => JSON.parse(line));
        return new Map(entries.map(entry => [entry.id, entry]));
    } catch (error) {
        if (error.code === "ENOENT") return new Map();
        throw error;
    }
}

function printStatus() {
    const supabaseRows = rows.filter(row =>
        (row.storage_provider || "supabase") === "supabase"
    );
    const r2Rows = rows.filter(row => row.storage_provider === "r2");
    console.log(JSON.stringify({
        storageObjects: objects.length,
        storageMB: toMB(sumSize(objects)),
        referencedSupabaseRows: supabaseRows.length,
        referencedSupabaseMB: toMB(sumSize(
            supabaseRows.map(row => objectByPath.get(row.photo_path)).filter(Boolean)
        )),
        r2Rows: r2Rows.length,
        orphanObjects: orphans.length,
        orphanMB: toMB(sumSize(orphans)),
        copiedManifestEntries: manifest.size
    }, null, 2));
}

async function backupInventories() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const referenced = rows
        .filter(row => (row.storage_provider || "supabase") === "supabase")
        .map(row => ({
            ...row,
            size: objectByPath.get(row.photo_path)?.size || 0
        }));
    const base = path.join(BACKUP_DIR, stamp);
    await mkdir(base, { recursive: true });
    await writeFile(
        path.join(base, "referenced-photos.json"),
        JSON.stringify(referenced, null, 2)
    );
    await writeFile(
        path.join(base, "orphan-photos.json"),
        JSON.stringify(orphans, null, 2)
    );
    await writeFile(
        path.join(base, "orphan-photos.csv"),
        ["name,size_bytes,size_mb,created_at", ...orphans.map(object => [
            csv(object.name),
            object.size,
            toMB(object.size),
            csv(object.created_at || "")
        ].join(","))].join("\n")
    );
    console.log(`백업 완료: ${base}`);
}

async function copyReferencedPhotos() {
    const candidates = rows.filter(row =>
        (row.storage_provider || "supabase") === "supabase" &&
        row.photo_path &&
        !manifest.has(row.id)
    );
    let completed = 0;

    await runPool(candidates, 4, async row => {
        const entry = await retry(
            () => copyOnePhoto(row),
            4,
            `사진 복사 ${row.photo_path}`
        );
        await appendFile(MANIFEST_PATH, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
        manifest.set(row.id, entry);
        completed += 1;
        if (completed % 25 === 0 || completed === candidates.length) {
            console.log(`R2 복사: ${completed}/${candidates.length}`);
        }
    });
}

async function copyOnePhoto(row) {
        const sourceObject = objectByPath.get(row.photo_path);
        if (!sourceObject) {
            throw new Error(`Supabase 원본 없음: ${row.photo_path}`);
        }
        const sourceResponse = await fetch(row.photo_url);
        await assertOk(sourceResponse, `원본 다운로드 (${row.photo_path})`);
        const contentType = normalizeContentType(
            sourceResponse.headers.get("content-type") || sourceObject.mimetype,
            row.photo_path
        );
        const contentLength = Number(
            sourceResponse.headers.get("content-length") || sourceObject.size
        );
        const uploadResponse = await fetch(`${WORKER_URL}/v1/photos`, {
            method: "POST",
            headers: {
                Origin: "http://localhost:8000",
                "Content-Type": contentType,
                "Content-Length": String(contentLength),
                "X-Record-Id": row.record_id,
                "X-Photo-Type": row.photo_type,
                "X-File-Name": path.basename(row.photo_path)
            },
            body: sourceResponse.body,
            duplex: "half"
        });
        await assertOk(uploadResponse, `R2 업로드 (${row.photo_path})`);
        const uploaded = await uploadResponse.json();
        const entry = {
            id: row.id,
            record_id: row.record_id,
            photo_type: row.photo_type,
            source_path: row.photo_path,
            source_url: row.photo_url,
            source_size: sourceObject.size,
            r2_path: uploaded.photoPath,
            r2_url: uploaded.photoUrl,
            delete_token: uploaded.deleteToken,
            copied_at: new Date().toISOString()
        };
        return entry;
}

async function verifyCopiedPhotos(verbose) {
    const failures = [];
    let verified = 0;
    await runPool([...manifest.values()], 8, async entry => {
        const response = await fetch(entry.r2_url, { method: "HEAD" });
        const actualSize = Number(response.headers.get("content-length") || 0);
        if (!response.ok || actualSize !== Number(entry.source_size)) {
            failures.push({
                id: entry.id,
                status: response.status,
                expected: entry.source_size,
                actual: actualSize
            });
        }
        verified += 1;
        if (verbose && (verified % 100 === 0 || verified === manifest.size)) {
            console.log(`R2 검증: ${verified}/${manifest.size}`);
        }
    });
    if (failures.length > 0) {
        await writeFile(
            path.join(STATE_DIR, "verification-failures.json"),
            JSON.stringify(failures, null, 2)
        );
        throw new Error(`R2 검증 실패 ${failures.length}개`);
    }
    console.log(`R2 검증 완료: ${verified}개`);
    return true;
}

async function verifySampleHashes() {
    const entries = [...manifest.values()];
    if (entries.length === 0) throw new Error("검증할 복사 매니페스트가 없습니다.");
    const indexes = [...new Set(
        Array.from({ length: Math.min(12, entries.length) }, (_, index) =>
            Math.round(index * (entries.length - 1) / Math.max(1, Math.min(12, entries.length) - 1))
        )
    )];
    let verified = 0;

    for (const index of indexes) {
        const entry = entries[index];
        const [sourceHash, r2Hash] = await Promise.all([
            retry(() => fetchHash(entry.source_url), 3, `표본 원본 ${entry.source_path}`),
            retry(() => fetchHash(entry.r2_url), 3, `표본 R2 ${entry.r2_path}`)
        ]);
        if (sourceHash !== r2Hash) {
            throw new Error(`표본 해시 불일치: ${entry.source_path}`);
        }
        verified += 1;
        console.log(`표본 해시 검증: ${verified}/${indexes.length}`);
    }
}

async function updateDatabaseRows() {
    await verifyCopiedPhotos(false);
    let updated = 0;
    for (const entry of manifest.values()) {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/install_photos?id=eq.${encodeURIComponent(entry.id)}`,
            {
                method: "PATCH",
                headers: {
                    ...apiHeaders,
                    "Content-Type": "application/json",
                    Prefer: "return=representation"
                },
                body: JSON.stringify({
                    photo_path: entry.r2_path,
                    photo_url: entry.r2_url,
                    storage_provider: "r2",
                    storage_delete_token: entry.delete_token
                })
            }
        );
        await assertOk(response, `DB 전환 (${entry.id})`);
        const changed = await response.json();
        if (changed.length !== 1) throw new Error(`DB 전환 행 수 오류: ${entry.id}`);
        updated += 1;
        if (updated % 100 === 0 || updated === manifest.size) {
            console.log(`DB 전환: ${updated}/${manifest.size}`);
        }
    }
}

async function deleteMigratedSources() {
    await verifyCopiedPhotos(false);
    const freshRows = await listPhotoRows();
    const rowById = new Map(freshRows.map(row => [row.id, row]));
    const paths = [];

    for (const entry of manifest.values()) {
        const row = rowById.get(entry.id);
        if (
            row?.storage_provider !== "r2" ||
            row?.photo_path !== entry.r2_path ||
            row?.photo_url !== entry.r2_url
        ) {
            throw new Error(`DB R2 전환 미확인: ${entry.id}`);
        }
        paths.push(entry.source_path);
    }
    await deleteStoragePaths(paths, "이전 원본 삭제");
}

async function deleteOrphans() {
    if (orphans.length === 0) {
        console.log("삭제할 고아 사진이 없습니다.");
        return;
    }
    await deleteStoragePaths(orphans.map(object => object.name), "고아 사진 삭제");
}

async function deleteStoragePaths(paths, label) {
    let deleted = 0;
    for (let index = 0; index < paths.length; index += 100) {
        const batch = paths.slice(index, index + 100);
        const response = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}`, {
            method: "DELETE",
            headers: {
                ...apiHeaders,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ prefixes: batch })
        });
        await assertOk(response, label);
        deleted += batch.length;
        console.log(`${label}: ${deleted}/${paths.length}`);
    }
}

async function runPool(items, concurrency, worker) {
    let cursor = 0;
    const runners = Array.from({ length: concurrency }, async () => {
        while (cursor < items.length) {
            const index = cursor;
            cursor += 1;
            await worker(items[index]);
        }
    });
    await Promise.all(runners);
}

async function retry(operation, attempts, label) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt === attempts) break;
            const delay = 500 * attempt * attempt;
            console.warn(`${label} 재시도 ${attempt}/${attempts - 1}: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

async function assertOk(response, label) {
    if (response.ok) return;
    const text = await response.text();
    throw new Error(`${label} 실패 (${response.status}): ${text.slice(0, 500)}`);
}

function normalizeContentType(value, fileName) {
    const type = String(value || "").split(";", 1)[0].toLowerCase();
    if (type === "image/jpg") return "image/jpeg";
    if (["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(type)) {
        return type;
    }
    const extension = path.extname(fileName).toLowerCase();
    if ([".jpg", ".jpeg"].includes(extension)) return "image/jpeg";
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    if (extension === ".heic") return "image/heic";
    if (extension === ".heif") return "image/heif";
    throw new Error(`지원하지 않는 사진 형식: ${fileName} (${value})`);
}

function sumSize(items) {
    return items.reduce((sum, item) => sum + Number(item?.size || 0), 0);
}

function toMB(bytes) {
    return Math.round(Number(bytes || 0) / 1024 / 1024 * 10) / 10;
}

function csv(value) {
    return `"${String(value).replaceAll('"', '""')}"`;
}

async function fetchHash(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
    await assertOk(response, `해시 대상 조회 (${url})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    return createHash("sha256").update(bytes).digest("hex");
}
