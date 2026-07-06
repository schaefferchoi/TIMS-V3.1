import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
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
    } = await req.json();

    const auth = btoa(`${email}:${token}`);

    const templateId = "2320893193";
    const parentPageId = "1048543457";

    const templateHtml = await buildTemplateHtml({
      url,
      auth,
      templateId,
      data,
      photos,
    });

    let result;

    if (pageId) {
      result = await updateConfluencePage({
        url,
        auth,
        pageId,
        title,
        templateHtml,
      });
    } else {
      result = await createConfluencePage({
        url,
        auth,
        space,
        parentPageId,
        title,
        templateHtml,
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
});

async function buildTemplateHtml({ url, auth, templateId, data, photos }: any) {
  const templateResponse = await fetch(
    `${url}/wiki/rest/api/content/${templateId}?expand=body.storage`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    }
  );

  const templateJson = await templateResponse.json();

  if (!templateResponse.ok) {
    throw new Error(JSON.stringify(templateJson));
  }

  let templateHtml = templateJson.body.storage.value;

  const photoHtml = {
    install: makePhotoHtml(photos, "install"),
    vehicle: makePhotoHtml(photos, "vehicle"),
    version: makePhotoHtml(photos, "version"),
    eps: makePhotoHtml(photos, "eps"),
    cpg: makePhotoHtml(photos, "cpg"),
    acu: makePhotoHtml(photos, "acu"),
  };

  return templateHtml
    .replaceAll("{{product_name}}", safe(data.product_name))
    .replaceAll("{{box_sn}}", safe(data.box_sn))
    .replaceAll("{{keypad_sn}}", safe(data.keypad_sn))
    .replaceAll("{{dealer_name}}", safe(data.dealer_name))
    .replaceAll("{{representative}}", safe(data.representative))
    .replaceAll("{{install_date}}", safe(data.install_date))
    .replaceAll("{{install_subject}}", safe(data.install_subject))
    .replaceAll("{{installer}}", safe(data.installer))
    .replaceAll("{{spline}}", safe(data.spline))
    .replaceAll("{{bracket}}", safe(data.bracket))
    .replaceAll("{{ad_a1_sw}}", safe(data.ad_a1_software))
    .replaceAll("{{coa_fw}}", safe(data.coa_fw))
    .replaceAll("{{ins_ver}}", safe(data.ins_ver))
    .replaceAll("{{moa_fw}}", safe(data.moa_fw))
    .replaceAll("{{cpg_fw}}", safe(data.cpg_fw))
    .replaceAll("{{adc2}}", safe(data.adc2))
    .replaceAll("{{cpad_sw}}", safe(data.cpad_sw))
    .replaceAll("{{machine_type}}", safe(data.machine_type))
    .replaceAll("{{manufacturer}}", safe(data.manufacturer))
    .replaceAll("{{model_sn}}", safe(data.model_sn))
    .replaceAll("{{machine_number}}", safe(data.machine_number || data.machineNumber))
    .replaceAll("{{customer_name}}", safe(data.customer_name))
    .replaceAll("{{phone}}", safe(data.customer_phone))
    .replaceAll("{{address}}", safe(data.customer_address))
    .replaceAll("{{education_date}}", safe(data.education_date))
    .replaceAll("{{farm_size}}", safe(data.farm_size || data.farm_scale))
    .replaceAll("{{main_crop}}", safe(data.main_crop))
    .replaceAll("{{memo}}", safe(data.memo))
    .replaceAll("{{major_issue}}", safe(data.major_issue))
    .replaceAll("{{install_photos}}", photoHtml.install)
    .replaceAll("{{vehicle_photos}}", photoHtml.vehicle)
    .replaceAll("{{version_photos}}", photoHtml.version)
    .replaceAll("{{eps_photos}}", photoHtml.eps)
    .replaceAll("{{cpg_photos}}", photoHtml.cpg)
    .replaceAll("{{acu_photos}}", photoHtml.acu)
    .replaceAll("{{install_issue}}", safe(data.install_issue))
    .replaceAll("{{vehicle_issue}}", safe(data.vehicle_issue))
    .replaceAll("{{version_issue}}", safe(data.version_issue))
    .replaceAll("{{eps_issue}}", safe(data.eps_issue))
    .replaceAll("{{cpg_issue}}", safe(data.cpg_issue))
    .replaceAll("{{acu_issue}}", safe(data.acu_issue));
}

async function createConfluencePage({ url, auth, space, parentPageId, title, templateHtml }: any) {
  const response = await fetch(`${url}/wiki/rest/api/content`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "page",
      title,
      space: { key: space },
      ancestors: [{ id: parentPageId }],
      body: {
        storage: {
          value: templateHtml,
          representation: "storage",
        },
      },
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }

  return {
    action: "created",
    pageId: result.id,
    title: result.title,
    url: result._links?.base + result._links?.webui,
    raw: result,
  };
}

async function updateConfluencePage({ url, auth, pageId, title, templateHtml }: any) {
  const currentResponse = await fetch(
    `${url}/wiki/rest/api/content/${pageId}?expand=version,space`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    }
  );

  const current = await currentResponse.json();

  if (!currentResponse.ok) {
    throw new Error(JSON.stringify(current));
  }

  const nextVersion = current.version.number + 1;

  const response = await fetch(`${url}/wiki/rest/api/content/${pageId}`, {
    method: "PUT",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: pageId,
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
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }

  return {
    action: "updated",
    pageId: result.id,
    title: result.title,
    url: result._links?.base + result._links?.webui,
    raw: result,
  };
}

function makePhotoHtml(photos: any[], type: string) {
  return photos
    .filter((photo) => photo.photo_type === type)
    .map((photo) => {
      const imageUrl = photo.photo_url || "";
      if (!imageUrl) return "";

      return `
        <p>
          <img
            src="${escapeAttr(imageUrl)}"
            style="
              width:45%;
              max-width:450px;
              margin:10px;
              border:1px solid #ccc;
              padding:5px;
            "
          />
        </p>
      `;
    })
    .join("");
}

function safe(value: unknown) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value: unknown) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
}