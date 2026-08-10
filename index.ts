// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders(),
    });
  }

  try {
    const {
      url,
      email,
      token,
      space,
      title,
      data,
      photos = [],
      pageId = null,
      parentPage = "",
    } = await req.json();

    if (!url || !email || !token) {
      return jsonResponse(
        {
          error: "Confluence 설정값이 누락되었습니다.",
        },
        400,
      );
    }

    if (!title) {
      return jsonResponse(
        {
          error: "Confluence 페이지 제목이 누락되었습니다.",
        },
        400,
      );
    }

    const baseUrl = normalizeBaseUrl(url);
    const auth = btoa(`${email}:${token}`);

    const templateId = "2320893193";
    const parentPageId = resolveParentPageId(parentPage) || "1048543457";

    /*
     * 템플릿 원본을 먼저 불러옵니다.
     */
    const templateSource = await fetchTemplateSource({
      baseUrl,
      auth,
      templateId,
    });

    /*
     * 기존 페이지 수정
     */
    if (pageId) {
      const photoHtml = await buildAllPhotoHtml({
        photos,
        baseUrl,
        pageId,
        auth,
      });

      const finalHtml = renderTemplate({
        templateSource,
        data,
        photoHtml,
      });

      const result = await updateConfluencePage({
        baseUrl,
        auth,
        pageId,
        title,
        templateHtml: finalHtml,
      });

      return jsonResponse(result, 200);
    }

    /*
     * 신규 페이지 생성
     *
     * 첨부파일은 pageId가 있어야 업로드할 수 있으므로
     * 먼저 사진이 없는 임시 본문으로 페이지를 생성합니다.
     */
    if (!space) {
      return jsonResponse(
        {
          error: "Confluence Space Key가 누락되었습니다.",
        },
        400,
      );
    }

    const temporaryPhotoHtml = emptyPhotoHtml();

    const temporaryHtml = renderTemplate({
      templateSource,
      data,
      photoHtml: temporaryPhotoHtml,
    });

    const createdPage = await createConfluencePage({
      baseUrl,
      auth,
      space,
      parentPageId,
      title,
      templateHtml: temporaryHtml,
    });

    /*
     * 생성된 페이지에 사진을 첨부합니다.
     */
    const photoHtml = await buildAllPhotoHtml({
      photos,
      baseUrl,
      pageId: createdPage.pageId,
      auth,
    });

    /*
     * 첨부파일을 참조하는 최종 본문을 생성합니다.
     */
    const finalHtml = renderTemplate({
      templateSource,
      data,
      photoHtml,
    });

    /*
     * 최종 본문으로 한 번 업데이트합니다.
     */
    const updatedPage = await updateConfluencePage({
      baseUrl,
      auth,
      pageId: createdPage.pageId,
      title,
      templateHtml: finalHtml,
    });

    return jsonResponse(
      {
        ...updatedPage,
        action: "created",
      },
      200,
    );
  } catch (error) {
    console.error("smooth-action 오류:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
});

/*
 * Confluence URL 정규화
 *
 * 아래 두 형식을 모두 처리합니다.
 *
 * https://회사명.atlassian.net
 * https://회사명.atlassian.net/wiki
 */
function normalizeBaseUrl(url: string) {
  const parsed = new URL(String(url).trim());
  const hostname = parsed.hostname.toLowerCase();
  const configuredHosts = (Deno.env.get("CONFLUENCE_ALLOWED_HOSTS") || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  const isAllowedHost =
    hostname === "atlassian.net" ||
    hostname.endsWith(".atlassian.net") ||
    configuredHosts.includes(hostname);

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !isAllowedHost
  ) {
    throw new Error("허용되지 않은 Confluence 주소입니다.");
  }

  return parsed.origin;
}

function resolveParentPageId(value: unknown) {
  const input = String(value || "").trim();

  if (!input) return "";
  if (/^\d+$/.test(input)) return input;

  try {
    const parsed = new URL(input);
    const queryId = parsed.searchParams.get("pageId");
    const pathId = parsed.pathname.match(/\/pages\/(\d+)(?:\/|$)/)?.[1];
    const pageId = queryId || pathId || "";

    if (/^\d+$/.test(pageId)) return pageId;
  } catch {
    // 아래의 사용자 안내 오류로 처리합니다.
  }

  throw new Error(
    "상위 페이지를 확인할 수 없습니다. 숫자 Page ID 또는 Page ID가 포함된 Confluence URL을 입력해 주세요.",
  );
}

/*
 * Confluence 템플릿 본문 불러오기
 */
async function fetchTemplateSource({
  baseUrl,
  auth,
  templateId,
}: {
  baseUrl: string;
  auth: string;
  templateId: string;
}) {
  const response = await fetch(
    `${baseUrl}/wiki/rest/api/content/${templateId}?expand=body.storage`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    },
  );

  const result = await response.json();

  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      console.warn(
        `Confluence 원격 템플릿을 사용할 수 없어 내장 템플릿을 사용합니다: ${response.status}`,
      );
      return builtInTemplateSource();
    }

    throw new Error(
      `Confluence 템플릿 조회 실패: ${response.status} ${JSON.stringify(result)}`,
    );
  }

  const templateSource = result?.body?.storage?.value;

  if (!templateSource) {
    throw new Error(
      "Confluence 템플릿 본문을 찾을 수 없습니다.",
    );
  }

  return templateSource;
}

function builtInTemplateSource() {
  return `
<table><tbody>
  <tr>
    <th>품명</th><th>BOX S/N</th><th>KEYPAD S/N</th><th>딜러점(지역)</th>
    <th>대표</th><th>장착 일자</th><th>장착 주체</th><th>장착 직원</th>
    <th>스플라인</th><th>브라켓</th><th>비고</th>
  </tr>
  <tr>
    <td>{{product_name}}</td><td>{{box_sn}}</td><td>{{keypad_sn}}</td><td>{{dealer_name}}</td>
    <td>{{representative}}</td><td>{{install_date}}</td><td>{{install_subject}}</td><td>{{installer}}</td>
    <td>{{spline}}</td><td>{{bracket}}</td><td>{{memo}}</td>
  </tr>
</tbody></table>

<table><tbody>
  <tr><th colspan="9">버전 정보 및 버전 이력 관리</th><th>비고</th></tr>
  <tr>
    <th>ADA1</th><th>자율주행 소프트웨어(MoA S/W)</th><td>{{ad_a1_sw}}</td>
    <th>자율주행 제어 펌웨어 (CoA F/W)</th><td>{{coa_fw}}</td>
    <th>INS Ver (INS S/W)</th><td>{{ins_ver}}</td>
    <th>MOA FS Version (MoA F/W)</th><td>{{moa_fw}}</td><td></td>
  </tr>
  <tr>
    <th>ADC2</th><th>CPG FS Version (CPG F/W)</th><td>{{cpg_fw}}</td>
    <th>ADC2 (CPG S/W)</th><td>{{adc2}}</td>
    <th>자율주행 콘솔 S/W (CPAD SW)</th><td>{{cpad_sw}}</td><td></td><td></td><td></td>
  </tr>
</tbody></table>

<table><tbody>
  <tr>
    <th>기종</th><th>제조사</th><th>모델명 (S/N)</th><th>고객명</th>
    <th>연락처</th><th>주소</th><th>교육 일자</th><th>교육 직원</th>
  </tr>
  <tr>
    <td>{{machine_type}}</td><td>{{manufacturer}}</td><td>{{model_sn}}</td><td>{{customer_name}}</td>
    <td>{{phone}}</td><td>{{address}}</td><td>{{education_date}}</td><td>{{education_staff}}</td>
  </tr>
  <tr>
    <th>농사 규모</th><td>{{farm_size}}</td><th>주요 작물</th><td>{{main_crop}}</td>
    <th>비고</th><td colspan="3">{{memo}}</td>
  </tr>
</tbody></table>

<table><tbody>
  <tr><th>장착 사진</th><th>주요 이슈</th></tr>
  <tr><td>{{install_photos}}</td><td>{{install_issue}}</td></tr>
  <tr><th>차량제원</th><td></td></tr>
  <tr><td>{{vehicle_photos}}</td><td>{{vehicle_issue}}</td></tr>
  <tr><th>F/W, S/W 버전</th><td></td></tr>
  <tr><td>{{version_photos}}</td><td>{{version_issue}}</td></tr>
  <tr><th>EPS부 장착 사진</th><td></td></tr>
  <tr><td>{{eps_photos}}</td><td>{{eps_issue}}</td></tr>
  <tr><th>CPG/KEYPAD 장착사진</th><td></td></tr>
  <tr><td>{{cpg_photos}}</td><td>{{cpg_issue}}</td></tr>
  <tr><th>ACU부 부착 사진</th><th>주요 이슈</th></tr>
  <tr><td>{{acu_photos}}</td><td>{{acu_issue}}</td></tr>
</tbody></table>`;
}

/*
 * 모든 사진 유형의 HTML을 생성합니다.
 */
async function buildAllPhotoHtml({
  photos,
  baseUrl,
  pageId,
  auth,
}: {
  photos: any[];
  baseUrl: string;
  pageId: string;
  auth: string;
}) {
  return {
    install: await makePhotoHtml(
      photos,
      "install",
      {
        baseUrl,
        pageId,
        auth,
      },
    ),

    vehicle: await makePhotoHtml(
      photos,
      "vehicle",
      {
        baseUrl,
        pageId,
        auth,
      },
    ),

    version: await makePhotoHtml(
      photos,
      "version",
      {
        baseUrl,
        pageId,
        auth,
      },
    ),

    eps: await makePhotoHtml(
      photos,
      "eps",
      {
        baseUrl,
        pageId,
        auth,
      },
    ),

    cpg: await makePhotoHtml(
      photos,
      "cpg",
      {
        baseUrl,
        pageId,
        auth,
      },
    ),

    acu: await makePhotoHtml(
      photos,
      "acu",
      {
        baseUrl,
        pageId,
        auth,
      },
    ),
  };
}

/*
 * 신규 페이지의 임시 사진 영역
 */
function emptyPhotoHtml() {
  const empty = "<p>등록된 사진 없음</p>";

  return {
    install: empty,
    vehicle: empty,
    version: empty,
    eps: empty,
    cpg: empty,
    acu: empty,
  };
}

/*
 * 템플릿 치환
 */
function renderTemplate({
  templateSource,
  data,
  photoHtml,
}: {
  templateSource: string;
  data: any;
  photoHtml: Record<string, string>;
}) {
  return templateSource
    .replaceAll(
      "{{product_name}}",
      safe(data.product_name),
    )
    .replaceAll(
      "{{box_sn}}",
      safe(data.box_sn),
    )
    .replaceAll(
      "{{keypad_sn}}",
      safe(data.keypad_sn),
    )
    .replaceAll(
      "{{dealer_name}}",
      safe(data.dealer_name),
    )
    .replaceAll(
      "{{representative}}",
      safe(data.representative),
    )
    .replaceAll(
      "{{install_date}}",
      safe(data.install_date),
    )
    .replaceAll(
      "{{install_subject}}",
      safe(data.install_subject),
    )
    .replaceAll(
      "{{installer}}",
      safe(data.installer),
    )
    .replaceAll(
      "{{spline}}",
      safe(data.spline),
    )
    .replaceAll(
      "{{bracket}}",
      safe(data.bracket),
    )
    .replaceAll(
      "{{ad_a1_sw}}",
      safe(data.ad_a1_software),
    )
    .replaceAll(
      "{{coa_fw}}",
      safe(data.coa_fw),
    )
    .replaceAll(
      "{{ins_ver}}",
      safe(data.ins_ver),
    )
    .replaceAll(
      "{{moa_fw}}",
      safe(data.moa_fw),
    )
    .replaceAll(
      "{{cpg_fw}}",
      safe(data.cpg_fw),
    )
    .replaceAll(
      "{{adc2}}",
      safe(data.adc2),
    )
    .replaceAll(
      "{{cpad_sw}}",
      safe(data.cpad_sw),
    )
    .replaceAll(
      "{{machine_type}}",
      safe(data.machine_type),
    )
    .replaceAll(
      "{{manufacturer}}",
      safe(data.manufacturer),
    )
    .replaceAll(
      "{{model_sn}}",
      safe(data.model_sn),
    )
    .replaceAll(
      "{{machine_number}}",
      safe(
        data.machine_number ||
          data.machineNumber,
      ),
    )
    .replaceAll(
      "{{customer_name}}",
      safe(data.customer_name),
    )
    .replaceAll(
      "{{phone}}",
      safe(data.customer_phone),
    )
    .replaceAll(
      "{{address}}",
      safe(data.customer_address),
    )
    .replaceAll(
      "{{education_date}}",
      safe(data.education_date),
    )
    .replaceAll(
      "{{education_staff}}",
      safe(data.education_staff),
    )
    .replaceAll(
      "{{farm_size}}",
      safe(
        data.farm_size ||
          data.farm_scale,
      ),
    )
    .replaceAll(
      "{{main_crop}}",
      safe(data.main_crop),
    )
    .replaceAll(
      "{{memo}}",
      safe(data.memo),
    )
    .replaceAll(
      "{{major_issue}}",
      safe(data.major_issue),
    )
    .replaceAll(
      "{{install_photos}}",
      photoHtml.install,
    )
    .replaceAll(
      "{{vehicle_photos}}",
      photoHtml.vehicle,
    )
    .replaceAll(
      "{{version_photos}}",
      photoHtml.version,
    )
    .replaceAll(
      "{{eps_photos}}",
      photoHtml.eps,
    )
    .replaceAll(
      "{{cpg_photos}}",
      photoHtml.cpg,
    )
    .replaceAll(
      "{{acu_photos}}",
      photoHtml.acu,
    )
    .replaceAll(
      "{{install_issue}}",
      safe(data.install_issue),
    )
    .replaceAll(
      "{{vehicle_issue}}",
      safe(data.vehicle_issue),
    )
    .replaceAll(
      "{{version_issue}}",
      safe(data.version_issue),
    )
    .replaceAll(
      "{{eps_issue}}",
      safe(data.eps_issue),
    )
    .replaceAll(
      "{{cpg_issue}}",
      safe(data.cpg_issue),
    )
    .replaceAll(
      "{{acu_issue}}",
      safe(data.acu_issue),
    );
}

/*
 * Confluence 페이지 생성
 */
async function createConfluencePage({
  baseUrl,
  auth,
  space,
  parentPageId,
  title,
  templateHtml,
}: {
  baseUrl: string;
  auth: string;
  space: string;
  parentPageId: string;
  title: string;
  templateHtml: string;
}) {
  const response = await fetch(
    `${baseUrl}/wiki/rest/api/content`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "page",
        title,
        space: {
          key: space,
        },
        ancestors: [
          {
            id: parentPageId,
          },
        ],
        body: {
          storage: {
            value: templateHtml,
            representation: "storage",
          },
        },
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Confluence 페이지 생성 실패: ${response.status} ${JSON.stringify(result)}`,
    );
  }

  return {
    action: "created",
    pageId: result.id,
    title: result.title,
    url:
      (result._links?.base || baseUrl) +
      (result._links?.webui || ""),
    raw: result,
  };
}

/*
 * Confluence 페이지 수정
 */
async function updateConfluencePage({
  baseUrl,
  auth,
  pageId,
  title,
  templateHtml,
}: {
  baseUrl: string;
  auth: string;
  pageId: string;
  title: string;
  templateHtml: string;
}) {
  const currentResponse = await fetch(
    `${baseUrl}/wiki/rest/api/content/${pageId}?expand=version,space`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    },
  );

  const current = await currentResponse.json();

  if (!currentResponse.ok) {
    throw new Error(
      `Confluence 페이지 정보 조회 실패: ${currentResponse.status} ${JSON.stringify(current)}`,
    );
  }

  const nextVersion =
    Number(current?.version?.number || 0) + 1;

  const response = await fetch(
    `${baseUrl}/wiki/rest/api/content/${pageId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: String(pageId),
        type: "page",
        title,
        version: {
          number: nextVersion,
        },
        body: {
          storage: {
            value: templateHtml,
            representation: "storage",
          },
        },
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Confluence 페이지 수정 실패: ${response.status} ${JSON.stringify(result)}`,
    );
  }

  return {
    action: "updated",
    pageId: result.id,
    title: result.title,
    url:
      (result._links?.base || baseUrl) +
      (result._links?.webui || ""),
    raw: result,
  };
}

/*
 * Supabase Storage 사진을 다운로드하여
 * Confluence 페이지 첨부파일로 업로드합니다.
 */
async function uploadConfluenceAttachment({
  baseUrl,
  pageId,
  auth,
  imageUrl,
  filename,
}: {
  baseUrl: string;
  pageId: string;
  auth: string;
  imageUrl: string;
  filename: string;
}) {
  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    throw new Error(
      `사진 다운로드 실패: ${imageResponse.status} ${imageUrl}`,
    );
  }

  const contentType =
    imageResponse.headers.get("content-type") ||
    getContentTypeFromFilename(filename);

  const imageBlob =
    await imageResponse.blob();

  const formData = new FormData();

  formData.append(
    "file",
    new File(
      [imageBlob],
      filename,
      {
        type: contentType,
      },
    ),
  );

  formData.append(
    "minorEdit",
    "true",
  );

  const uploadResponse = await fetch(
    `${baseUrl}/wiki/rest/api/content/${pageId}/child/attachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "X-Atlassian-Token": "nocheck",
        Accept: "application/json",
      },
      body: formData,
    },
  );

  if (!uploadResponse.ok) {
    const errorText =
      await uploadResponse.text();

    throw new Error(
      `Confluence 첨부 업로드 실패: ${uploadResponse.status} ${errorText}`,
    );
  }

  return await uploadResponse.json();
}

/*
 * 사진 유형별 첨부파일 HTML 생성
 */
async function makePhotoHtml(
  photos: any[],
  type: string,
  context: {
    baseUrl: string;
    pageId: string;
    auth: string;
  },
) {
  const filtered = photos.filter(
    (photo) =>
      photo.photo_type === type,
  );

  if (filtered.length === 0) {
    return "<p>등록된 사진 없음</p>";
  }

  const htmlParts: string[] = [];

  /*
   * 페이지 수정 시 같은 파일명 충돌을 피하기 위해
   * 실행 시각을 파일명에 포함합니다.
   */
  const uploadBatchId = Date.now();

  for (
    let index = 0;
    index < filtered.length;
    index++
  ) {
    const photo = filtered[index];

    const imageUrl =
      photo.photo_url ||
      photo.url ||
      "";

    const label =
      photo.photo_label ||
      photo.photo_name ||
      photo.name ||
      getDefaultPhotoLabel(type, index);

    if (!imageUrl) {
      continue;
    }

    const extension =
      getImageExtension(imageUrl) ||
      "jpg";

    const filename =
      `${type}_${uploadBatchId}_${index + 1}.${extension}`;

    await uploadConfluenceAttachment({
      baseUrl: context.baseUrl,
      pageId: context.pageId,
      auth: context.auth,
      imageUrl,
      filename,
    });

    htmlParts.push(`
      <table style="width:100%; margin:10px 0;">
        <tbody>
          <tr>
            <td style="width:100%; vertical-align:top;">
              <p>
                <strong>${safe(label)}</strong>
              </p>

              <ac:image ac:width="700">
                <ri:attachment ri:filename="${escapeAttr(filename)}" />
              </ac:image>
            </td>
          </tr>
        </tbody>
      </table>
    `);
  }

  if (htmlParts.length === 0) {
    return "<p>등록된 사진 없음</p>";
  }

  return htmlParts.join("");
}

/*
 * URL에서 사진 확장자 추출
 */
function getImageExtension(url: string) {
  try {
    const pathname =
      new URL(url).pathname;

    const match =
      pathname.match(
        /\.([a-zA-Z0-9]+)$/,
      );

    if (!match) {
      return null;
    }

    const extension =
      match[1].toLowerCase();

    if (
      [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
      ].includes(extension)
    ) {
      return extension;
    }

    return null;
  } catch {
    return null;
  }
}

/*
 * 파일명 기준 Content-Type 보완
 */
function getContentTypeFromFilename(
  filename: string,
) {
  const extension =
    filename
      .split(".")
      .pop()
      ?.toLowerCase();

  switch (extension) {
    case "png":
      return "image/png";

    case "gif":
      return "image/gif";

    case "webp":
      return "image/webp";

    case "jpeg":
    case "jpg":
    default:
      return "image/jpeg";
  }
}

/*
 * 사진 기본 라벨
 */
function getDefaultPhotoLabel(
  type: string,
  index: number,
) {
  const labels: Record<string, string> = {
    install: "장착 사진",
    vehicle: "차량 사진",
    version: "버전 사진",
    eps: "EPS 사진",
    cpg: "CPG 사진",
    acu: "ACU 사진",
  };

  const label =
    labels[type] || "사진";

  return `${label} ${index + 1}`;
}

/*
 * HTML 텍스트 이스케이프
 */
function safe(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/*
 * HTML 속성 이스케이프
 */
function escapeAttr(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/*
 * JSON Response
 */
function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: corsHeaders(),
    },
  );
}

/*
 * CORS
 */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":
      "POST, PUT, OPTIONS",
    "Content-Type":
      "application/json; charset=utf-8",
  };
}
