import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders() });
    }

    try {
        const {
            action = "page",
            url,
            email,
            token,
            pageId,
            attachmentId,
            downloadPath,
            pageUrl
        } = await req.json();

        if (!url || !email || !token) {
            return jsonResponse({ error: "Confluence 설정값이 누락되었습니다." }, 400);
        }

        const baseUrl = normalizeConfluenceBaseUrl(url);
        const auth = btoa(`${email}:${token}`);

        if (action === "resolve") {
            const targetUrl = normalizeConfluencePageUrl(baseUrl, pageUrl);
            const pageResponse = await fetch(targetUrl, {
                method: "GET",
                headers: {
                    Authorization: `Basic ${auth}`,
                    Accept: "text/html,application/xhtml+xml"
                },
                redirect: "follow"
            });

            if (!pageResponse.ok) {
                return jsonResponse({
                    error: "Confluence 페이지 URL 확인 실패",
                    status: pageResponse.status
                }, pageResponse.status);
            }

            const resolvedUrl = pageResponse.url;
            const resolvedPageId = extractConfluencePageId(resolvedUrl);

            if (!resolvedPageId) {
                return jsonResponse({
                    error: "Confluence URL에서 Page ID를 찾을 수 없습니다."
                }, 400);
            }

            return jsonResponse({
                pageId: resolvedPageId,
                url: resolvedUrl
            });
        }

        if (action === "download") {
            if (!attachmentId && !downloadPath) {
                return jsonResponse({
                    error: "attachmentId 또는 downloadPath가 없습니다."
                }, 400);
            }

            const downloadUrl = attachmentId
                ? buildAttachmentDownloadUrl(baseUrl, pageId, attachmentId)
                : resolveConfluenceDownloadUrl(baseUrl, downloadPath);
            const imageResponse = await fetch(downloadUrl, {
                method: "GET",
                headers: {
                    Authorization: `Basic ${auth}`,
                    Accept: "image/*,application/octet-stream;q=0.9,*/*;q=0.8"
                },
                redirect: "follow"
            });

            if (!imageResponse.ok) {
                const errorText = await imageResponse.text();
                console.error("Confluence 첨부파일 다운로드 실패", {
                    status: imageResponse.status,
                    path: new URL(downloadUrl).pathname
                });
                return jsonResponse({
                    error: "첨부파일 다운로드 실패",
                    status: imageResponse.status,
                    detail: errorText.slice(0, 500)
                }, imageResponse.status);
            }

            return new Response(await imageResponse.arrayBuffer(), {
                status: 200,
                headers: {
                    ...corsHeaders(),
                    "Content-Type":
                        imageResponse.headers.get("content-type") ||
                        "application/octet-stream",
                    "Content-Disposition":
                        imageResponse.headers.get("content-disposition") ||
                        "inline"
                }
            });
        }

        if (!pageId) {
            return jsonResponse({ error: "Page ID가 없습니다." }, 400);
        }

        const pageResponse = await fetch(
            `${baseUrl}/wiki/rest/api/content/${encodeURIComponent(pageId)}` +
            "?expand=body.storage,version,title",
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    Accept: "application/json"
                }
            }
        );
        const pageResult = await pageResponse.json();

        if (!pageResponse.ok) {
            return jsonResponse(pageResult, pageResponse.status);
        }

        const attachmentResponse = await fetch(
            `${baseUrl}/wiki/rest/api/content/${encodeURIComponent(pageId)}` +
            "/child/attachment?limit=200&expand=metadata,extensions,version",
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    Accept: "application/json"
                }
            }
        );
        const attachmentResult = await attachmentResponse.json();

        if (!attachmentResponse.ok) {
            return jsonResponse(attachmentResult, attachmentResponse.status);
        }

        const attachments = (attachmentResult.results || [])
            .filter((attachment: any) => {
                const mediaType =
                    attachment.metadata?.mediaType ||
                    attachment.extensions?.mediaType ||
                    "";
                return mediaType.startsWith("image/");
            })
            .map((attachment: any) => ({
                id: attachment.id,
                filename: attachment.title,
                mediaType:
                    attachment.metadata?.mediaType ||
                    attachment.extensions?.mediaType ||
                    "image/jpeg",
                fileSize:
                    attachment.extensions?.fileSize ||
                    attachment.metadata?.fileSize ||
                    null,
                downloadPath: attachment._links?.download || null
            }))
            .filter((attachment: any) => attachment.downloadPath);

        return jsonResponse({
            pageId: pageResult.id,
            title: pageResult.title,
            html: pageResult.body?.storage?.value || "",
            version: pageResult.version?.number || null,
            attachments
        });
    } catch (error) {
        console.error("import-confluence 오류", error);
        return jsonResponse({
            error: error instanceof Error ? error.message : String(error)
        }, 500);
    }
});

function normalizeConfluenceBaseUrl(value: string) {
    const parsed = new URL(String(value).trim());

    if (
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password ||
        !(
            parsed.hostname === "atlassian.net" ||
            parsed.hostname.endsWith(".atlassian.net")
        )
    ) {
        throw new Error("허용되지 않은 Confluence 주소입니다.");
    }

    return parsed.origin;
}

function resolveConfluenceDownloadUrl(baseUrl: string, value: string) {
    const rawPath = String(value).trim();
    const candidate = new URL(rawPath, `${baseUrl}/wiki/`);
    const base = new URL(baseUrl);

    if (candidate.origin !== base.origin) {
        throw new Error("허용되지 않은 첨부파일 호스트입니다.");
    }

    let pathname = candidate.pathname.replace(/\/{2,}/g, "/");
    if (pathname.startsWith("/download/")) {
        pathname = `/wiki${pathname}`;
    }

    if (!pathname.startsWith("/wiki/download/")) {
        throw new Error("허용되지 않은 다운로드 경로입니다.");
    }

    candidate.pathname = pathname;
    return candidate.toString();
}

function buildAttachmentDownloadUrl(
    baseUrl: string,
    pageId: string,
    attachmentId: string
) {
    const safePageId = String(pageId || "").trim();
    const safeAttachmentId = String(attachmentId || "")
        .trim()
        .replace(/^att/i, "");

    if (!/^\d+$/.test(safePageId) || !/^\d+$/.test(safeAttachmentId)) {
        throw new Error("허용되지 않은 Page ID 또는 Attachment ID입니다.");
    }

    return `${baseUrl}/wiki/rest/api/content/` +
        `${encodeURIComponent(safePageId)}/child/attachment/` +
        `${encodeURIComponent(safeAttachmentId)}/download`;
}

function normalizeConfluencePageUrl(baseUrl: string, pageUrl: string) {
    let candidate: URL;

    try {
        candidate = new URL(String(pageUrl || "").trim());
    } catch {
        throw new Error("올바른 Confluence 페이지 URL이 아닙니다.");
    }

    if (candidate.origin !== new URL(baseUrl).origin) {
        throw new Error("설정된 Confluence 사이트와 다른 URL입니다.");
    }

    if (!candidate.pathname.startsWith("/wiki/")) {
        throw new Error("허용되지 않은 Confluence 페이지 URL입니다.");
    }

    return candidate.toString();
}

function extractConfluencePageId(pageUrl: string) {
    const match =
        pageUrl.match(/[?&]pageId=(\d+)/) ||
        pageUrl.match(/\/pages\/(\d+)(?:\/|$)/);

    return match?.[1] || null;
}

function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: corsHeaders()
    });
}

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json"
    };
}
