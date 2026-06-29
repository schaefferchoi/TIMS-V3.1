// TIM v2.1
// Tab Controller

document.addEventListener("DOMContentLoaded", () => {

    const tabs = document.querySelectorAll(".tab");
    const pages = document.querySelectorAll(".page");

    function showTab(tabName){

        pages.forEach(page=>{
            page.classList.add("hidden");
        });

        tabs.forEach(tab=>{
            tab.classList.remove("active");
        });

        const targetPage =
            document.getElementById(tabName + "Tab");

        if(targetPage){
            targetPage.classList.remove("hidden");
        }

        const targetButton =
            document.querySelector(`[data-tab="${tabName}"]`);

        if(targetButton){
            targetButton.classList.add("active");
        }
        if (tabName === "list") {
    loadRecords();
}

    }

    tabs.forEach(tab=>{

        tab.addEventListener("click",()=>{

            const tabName =
                tab.dataset.tab;

            showTab(tabName);

        });

    });

    showTab("dashboard");

});
function collectFormData() {
    const form = document.getElementById("installForm");
    const formData = new FormData(form);

    const recordId = document.getElementById("recordId").value;
    console.log("recordId =", recordId);

    return {
        id: recordId || undefined,
        install_date: formData.get("install_date") || null,
        dealer_name: formData.get("dealer_name") || null,
        representative: formData.get("representative") || null,
        installer: formData.get("installer") || null,
        install_subject: formData.get("install_subject") || null,
        product_name: formData.get("product_name") || null,
        box_sn: formData.get("box_sn") || null,
        keypad_sn: formData.get("keypad_sn") || null,
        spline: formData.get("spline") || null,
        bracket: formData.get("bracket") || null,
        machine_type: formData.get("machine_type") || null,
        manufacturer: formData.get("manufacturer") || null,
        model_sn: formData.get("model_sn") || null,
        customer_name: formData.get("customer_name") || null,
        customer_phone: formData.get("customer_phone") || null,
        customer_address: formData.get("customer_address") || null,
        education_date: formData.get("education_date") || null,
        farm_scale: formData.get("farm_scale") || null,
        main_crop: formData.get("main_crop") || null,
        memo: formData.get("memo") || null,
        major_issue: formData.get("major_issue") || null,
        ad_a1_software: formData.get("ad_a1_software") || null,
        coa_fw: formData.get("coa_fw") || null,
        ins_ver: formData.get("ins_ver") || null,
        moa_fw: formData.get("moa_fw") || null,
        cpg_fw: formData.get("cpg_fw") || null,
        adc2: formData.get("adc2") || null,
        cpad_sw: formData.get("cpad_sw") || null
    };
}

async function saveRecord(record) {
    let result;

if (record.id) {

    result = await supabaseClient
        .from("install_records")
        .update(record)
        .eq("id", record.id);

} else {

    const { id, ...insertRecord } = record;

    result = await supabaseClient
        .from("install_records")
        .insert([insertRecord]);

}

const { data, error } = result;

    if (error) {
        console.error(error);
        alert("저장 실패");
        return false;
    }

    console.log(data);
    alert("저장 완료");
    return true;
}
document.getElementById("installForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const record = collectFormData();

    console.log("저장할 데이터:", record);

    await saveRecord(record);
});
// =============================
// 장착목록 조회
// =============================

async function loadRecords() {
    const { data, error } = await supabaseClient
        .from("install_records")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        alert("목록 조회 실패");
        return;
    }

    console.log("현재 목록", data);
    renderRecords(data || []);
}
function renderRecords(records) {
    const tbody = document.getElementById("recordsBody");

    if (!tbody) return;

    if (!records.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty">저장된 데이터가 없습니다.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(record => `
        <tr>
            <td>${record.install_date || "-"}</td>
            <td>${record.customer_name || "-"}</td>
            <td>
                ${record.product_name || "-"}<br>
                <small>BOX: ${record.box_sn || "-"}</small>
            </td>
            <td>
                ${record.manufacturer || ""} ${record.model_sn || ""}
            </td>
            <td>${record.status || "저장"}</td>
            <td>
    <button class="secondary"
        type="button"
        onclick="viewRecord('${record.id}')">
        보기
    </button>

    <button class="danger"
        type="button"
        onclick="deleteRecord('${record.id}')">
        삭제
    </button>
</td>
        </tr>
    `).join("");
}
// =============================
// 장착 상세 보기
// =============================

async function viewRecord(id) {
    console.log("보기 클릭:", id);
    const { data, error } = await supabaseClient
        .from("install_records")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error(error);
        alert("데이터 불러오기 실패");
        return;
    }

    fillForm(data);
    await loadPhotos();
    document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
});

document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.remove("active");
});

document.getElementById("formTab").classList.remove("hidden");
document.querySelector('[data-tab="form"]').classList.add("active");
}
function fillForm(record) {
    const form = document.getElementById("installForm");

    Object.keys(record).forEach((key) => {
        const input = form.elements[key];

        if (input) {
            input.value = record[key] || "";
        }
    });

    const recordIdInput = document.getElementById("recordId");

    if (recordIdInput) {
        recordIdInput.value = record.id;
    }
}
async function deleteRecord(id) {
    console.log("삭제 시도 id:", id);

    if (!confirm("정말 삭제하시겠습니까?")) {
        return;
    }

    const { error } = await supabaseClient
        .from("install_records")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("삭제 실패");
        return;
    }

    alert("삭제 완료");
    
    await loadRecords();
}
document.getElementById("goPhotoBtn").addEventListener("click", () => {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.add("hidden");
    });

    document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.remove("active");
    });

    document.getElementById("photosTab").classList.remove("hidden");
    document.querySelector('[data-tab="photos"]').classList.add("active");
});
// ==========================
// 사진 업로드
// ==========================
async function uploadPhoto() {

    const recordId = document.getElementById("recordId").value;

    if (!recordId) {
        alert("먼저 장착정보를 저장하거나 보기로 열어주세요.");
        return;
    }

    const input = document.getElementById("photoInput");

    if (!input.files.length) {
        alert("사진을 선택하세요.");
        return;
    }

    for (const file of input.files) {

        const ext = file.name.split(".").pop().toLowerCase();

        const fileName =
        `${recordId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } =
            await supabaseClient.storage
                .from("install-photos")
                .upload(fileName, file);

        if (uploadError) {
            console.error(uploadError);
            alert("사진 업로드 실패");
            return;
        }

        const { data: publicUrlData } =
            supabaseClient.storage
                .from("install-photos")
                .getPublicUrl(fileName);

        await supabaseClient
            .from("install_photos")
            .insert({
                record_id: recordId,
                photo_url: publicUrlData.publicUrl,
                photo_path: fileName
            });

    }

    alert("사진 업로드 완료");
    await loadPhotos(); 
    }


document.getElementById("uploadPhotoBtn").addEventListener("click", () => {
    console.log("업로드 버튼 클릭");
    uploadPhoto();
});
async function loadPhotos() {
    const recordId = document.getElementById("recordId").value;

    if (!recordId) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("install_photos")
        .select("*")
        .eq("record_id", recordId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        alert("사진 목록 조회 실패");
        return;
    }

    renderPhotos(data || []);
}
function renderPhotos(photos) {
    const preview = document.getElementById("photoPreview");

    if (!preview) return;

    if (!photos.length) {
        preview.innerHTML = "<p class='muted'>등록된 사진이 없습니다.</p>";
        return;
    }

    preview.innerHTML = photos.map(photo => {
        const { data } = supabaseClient.storage
            .from("install-photos")
            .getPublicUrl(photo.photo_path);

        return `
    <div class="photo-card">
        <img
    src="${data.publicUrl}"
    alt="장착사진"
    onclick="openPhoto('${data.publicUrl}')">
        <button
            type="button"
            class="danger"
            onclick="deletePhoto('${photo.id}', '${photo.photo_path}')">
            삭제
        </button>
    </div>
`;
    }).join("");
}
async function deletePhoto(photoId, photoPath) {
    if (!confirm("이 사진을 삭제하시겠습니까?")) {
        return;
    }

    const { error: storageError } = await supabaseClient.storage
        .from("install-photos")
        .remove([photoPath]);

    if (storageError) {
        console.error(storageError);
        alert("Storage 사진 삭제 실패");
        return;
    }

    const { error: dbError } = await supabaseClient
        .from("install_photos")
        .delete()
        .eq("id", photoId);

    if (dbError) {
        console.error(dbError);
        alert("DB 사진 삭제 실패");
        return;
    }

    alert("사진 삭제 완료");
    await loadPhotos();
}
function openPhoto(url) {
    window.open(url, "_blank");
}
document
.getElementById("confluenceBtn")
.addEventListener("click", generateConfluence);
async function generateConfluence() {

    const form = document.getElementById("installForm");

    const data = Object.fromEntries(
        new FormData(form)
    );
    const recordId = document.getElementById("recordId").value;

    const url = localStorage.getItem("confUrl");
    const email = localStorage.getItem("confEmail");
    const token = localStorage.getItem("confToken");
    const space = localStorage.getItem("confSpace");

const { data: photos, error: photoError } = await supabaseClient
    .from("install_photos")
    .select("*")
    .eq("record_id", recordId)
    .order("created_at", { ascending: true });

if (photoError) {
    console.error(photoError);
}
const photoHtml = (photos || []).map(photo => {
    const { data } = supabaseClient.storage
        .from("install-photos")
        .getPublicUrl(photo.photo_path);

    return `<img src="${data.publicUrl}" style="
width:45%;
max-width:450px;
margin:10px;
border:1px solid #ccc;
padding:5px;
">`;
}).join("");

    const html = `
<h1>장착 보고서</h1>

<h2>장착 정보</h2>

<table border="1" cellspacing="0" cellpadding="5">

<tr><td>고객명</td><td>${data.customer_name}</td></tr>

<tr><td>딜러점</td><td>${data.dealer_name}</td></tr>

<tr><td>BOX S/N</td><td>${data.box_sn}</td></tr>

<tr><td>KEYPAD S/N</td><td>${data.keypad_sn}</td></tr>

<tr><td>장착일자</td><td>${data.install_date}</td></tr>

</table>

<h2>주요 이슈</h2>

<p>${data.major_issue}</p>

<h2>장착사진</h2>

${photoHtml}

<h2>비고</h2>

<p>${data.memo}</p>
`;

    console.log(html);

   const dateCode = (data.install_date || "")
    .replaceAll("-", "")
    .slice(2); 
    
    const pageTitle =
    `[${dateCode}] ${data.dealer_region || data.dealer_name || ""} ${data.manufacturer || ""}${data.model_sn || ""}_${data.box_sn || ""}`;

    const response = await fetch(
    "https://istnemevsmoymydfgvwy.supabase.co/functions/v1/smooth-action",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url,
            email,
            token,
            space,
            title: pageTitle,
            data
        })
    }
);

const result = await response.json();

console.log(result);

if (response.ok) {
    alert("Confluence 페이지 생성 완료!");
} else {
    alert("생성 실패");
    console.error(result);
}

    
}
document
.getElementById("saveSettingBtn")
.addEventListener("click", saveConfluenceSetting);

function saveConfluenceSetting(){

    localStorage.setItem(
        "confUrl",
        document.getElementById("confUrl").value
    );

    localStorage.setItem(
        "confEmail",
        document.getElementById("confEmail").value
    );

    localStorage.setItem(
        "confToken",
        document.getElementById("confToken").value
    );

    localStorage.setItem(
        "confSpace",
        document.getElementById("confSpace").value
    );

    alert("Confluence 설정이 저장되었습니다.");
}

document.getElementById("confUrl").value =
localStorage.getItem("confUrl") || "";

document.getElementById("confEmail").value =
localStorage.getItem("confEmail") || "";

document.getElementById("confToken").value =
localStorage.getItem("confToken") || "";

document.getElementById("confSpace").value =
localStorage.getItem("confSpace") || "";

document.getElementById("newRecordBtn").addEventListener("click", () => {

    document.getElementById("installForm").reset();

    document.getElementById("recordId").value = "";

   const statusInput = document.querySelector('[name="status"]');
    if (statusInput) {
        statusInput.value = "draft";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

});