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
        education_staff: formData.get("education_staff") || null,
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
        .eq("id", record.id)
        .select()
        .single();

} else {

    const { id, ...insertRecord } = record;

   result = await supabaseClient
     .from("install_records")
     .insert([insertRecord])
     .select()
     .single();
}

const { data, error } = result;

    if (error) {
        console.error(error);
        alert("저장 실패");
        return false;
    }

    console.log(data);

const savedRecord = Array.isArray(data) ? data[0] : data;

if (savedRecord && savedRecord.id) {
    document.getElementById("recordId").value = savedRecord.id;
}

await uploadTempPhotos(savedRecord.id);

alert("저장 완료");
return savedRecord;
}

async function uploadTempPhotos(recordId) {
    if (!recordId) return;

    for (const photoType in tempPhotos) {
        for (const file of tempPhotos[photoType]) {
            const ext = file.name.split(".").pop().toLowerCase();
            const fileName = `${recordId}/${photoType}_${Date.now()}_${crypto.randomUUID()}.${ext}`;

            const { error: uploadError } = await supabaseClient.storage
                .from("install-photos")
                .upload(fileName, file);

            if (uploadError) {
                console.error(uploadError);
                alert("사진 업로드 실패");
                return;
            }

            const { data: publicUrlData } = supabaseClient.storage
                .from("install-photos")
                .getPublicUrl(fileName);

            const { error: insertError } = await supabaseClient
                .from("install_photos")
                .insert({
                    record_id: recordId,
                    photo_type: photoType,
                    photo_path: fileName,
                    photo_url: publicUrlData.publicUrl
                });

            if (insertError) {
                console.error(insertError);
                alert("사진 정보 저장 실패");
                return;
            }
        }
    }

    tempPhotos = {
        install: [],
        vehicle: [],
        version: [],
        eps: [],
        cpg: [],
        acu: []
    };

    await loadPhotos();
}

function renderTempPhotos(photoType) {
    const photoAreaMap = {
        install: "installPhotos",
        vehicle: "vehiclePhotos",
        version: "versionPhotos",
        eps: "epsPhotos",
        cpg: "cpgPhotos",
        acu: "acuPhotos"
    };

    const target = document.getElementById(photoAreaMap[photoType]);
    if (!target) return;

    target.innerHTML = "";

    tempPhotos[photoType].forEach((file, index) => {
        const imageUrl = URL.createObjectURL(file);

        target.innerHTML += `
            <div class="photo-card">
                <img src="${imageUrl}" alt="사진">
                <button
                    type="button"
                    class="danger"
                    onclick="removeTempPhoto('${photoType}', ${index})">
                    삭제
                </button>
            </div>
        `;
    });
}

function removeTempPhoto(photoType, index) {
    tempPhotos[photoType].splice(index, 1);
    renderTempPhotos(photoType);
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
let allRecords = [];

async function loadRecords() {
    const { data, error } = await supabaseClient
        .from("install_records")
        .select("*")
        .order("created_at", { ascending: false });
    
    const { data: photos, error: photoError } = await supabaseClient
        .from("install_photos")
        .select("record_id");
    
    if (error) {
        console.error(error);
        alert("목록 조회 실패");
        return;
    }

    const photoCountMap = {};

(photos || []).forEach(photo => {
    photoCountMap[photo.record_id] =
        (photoCountMap[photo.record_id] || 0) + 1;
});

    console.log("현재 목록", data);
    
    allRecords = (data || []).map(record => ({
    ...record,
    photoCount: photoCountMap[record.id] || 0
}));
    applyRecordFilters();
}
function renderRecords(records) {
    const tbody = document.getElementById("recordsBody");

    if (!tbody) return;

    if (!records.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">저장된 데이터가 없습니다.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(record => {
        const confluenceClick = record.confluence_page_url
            ? "openConfluenceById('" + record.id + "')"
            : "linkConfluenceById('" + record.id + "')";

        const confluenceText = record.confluence_page_url
            ? "🟢 열기"
            : "🔴 연결";

        return `
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
                <td>${record.photoCount || 0} / 8</td>
                <td>${record.status || "저장"}</td>

                <td>
                    <button
                        type="button"
                        class="secondary"
                        onclick="${confluenceClick}">
                        ${confluenceText}
                    </button>
                </td>

                <td>
                    <button
                        class="secondary"
                        type="button"
                        onclick="viewRecord('${record.id}')">
                        보기
                    </button>

                    <button
                        class="danger"
                        type="button"
                        onclick="deleteRecord('${record.id}')">
                        삭제
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}
function applyRecordFilters() {
    const keyword =
        document.getElementById("searchInput")?.value.trim().toLowerCase() || "";

    const filter =
    document.querySelector(".filter-chip.active")?.dataset.filter || "all";

    let records = [...allRecords];

    if (keyword) {
        records = records.filter(record => {
            const target = [
                record.customer_name,
                record.box_sn,
                record.keypad_sn,
                record.model_sn,
                record.dealer_name,
                record.product_name,
                record.manufacturer,
                record.installer
            ].join(" ").toLowerCase();

            return target.includes(keyword);
        });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (filter === "today") {
        records = records.filter(record => record.install_date === todayStr);
    }

    if (filter === "week") {
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().slice(0, 10);
    const sundayStr = sunday.toISOString().slice(0, 10);

    records = records.filter(record => {
        const date = record.install_date || "";
        return date >= mondayStr && date <= sundayStr;
    });
    }

    if (filter === "month") {
        const monthStr = todayStr.slice(0, 7);
        records = records.filter(record =>
            (record.install_date || "").startsWith(monthStr)
        );
    }

    if (filter === "saved") {
        records = records.filter(record =>
            (record.status || "저장") === "저장"
        );
    }

    if (filter === "photoMissing") {
        records = records.filter(record => (record.photoCount || 0) === 0);
    }

    renderRecords(records);
}
// =============================
// 장착 상세 보기
// =============================

async function editRecord(id) {
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
async function viewRecord(id) {
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

    const modal = document.getElementById("viewModal");
    modal.dataset.recordId = id;

    const content = document.getElementById("viewContent");

    content.innerHTML = `
        <div class="view-section">
            <h4>장착정보</h4>
            <p><b>장착일:</b> ${data.install_date || "-"}</p>
            <p><b>품명:</b> ${data.product_name || "-"}</p>
            <p><b>BOX S/N:</b> ${data.box_sn || "-"}</p>
            <p><b>KEYPAD S/N:</b> ${data.keypad_sn || "-"}</p>
            <p><b>딜러점:</b> ${data.dealer_name || "-"}</p>
            <p><b>장착직원:</b> ${data.installer || "-"}</p>
        </div>

        <div class="view-section">
            <h4>농기계 / 고객</h4>
            <p><b>고객명:</b> ${data.customer_name || "-"}</p>
            <p><b>연락처:</b> ${data.customer_phone || "-"}</p>
            <p><b>제조사:</b> ${data.manufacturer || "-"}</p>
            <p><b>모델명/SN:</b> ${data.model_sn || "-"}</p>
            <p><b>주소:</b> ${data.customer_address || "-"}</p>
        </div>

        <div class="view-section">
            <h4>비고</h4>
            <p>${data.memo || "-"}</p>
        </div>
    `;

    modal.classList.remove("hidden");
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

let tempPhotos = {
    install: [],
    vehicle: [],
    version: [],
    eps: [],
    cpg: [],
    acu: []
};

async function uploadPhotoByType(photoType, inputId) {

    const input = document.getElementById(inputId);

    if (!input || input.files.length === 0) {
        return;
    }

    // 선택한 사진을 tempPhotos에 저장
    for (const file of input.files) {
        tempPhotos[photoType].push(file);
    }

    // 미리보기 갱신
    renderTempPhotos(photoType);

    // 같은 파일을 다시 선택할 수 있도록 초기화
    input.value = "";
}

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

    const photoAreaMap = {
        install: "installPhotos",
        vehicle: "vehiclePhotos",
        version: "versionPhotos",
        eps: "epsPhotos",
        cpg: "cpgPhotos",
        acu: "acuPhotos"
    };

    // 기존 사진 비우기
    Object.values(photoAreaMap).forEach(id => {
        const area = document.getElementById(id);
        if (area) area.innerHTML = "";
    });

    // 사진 출력
    photos.forEach(photo => {

        const target = document.getElementById(photoAreaMap[photo.photo_type]);

        if (!target) return;

        target.innerHTML += `
            <div class="photo-card">

                <img
                    src="${photo.photo_url}"
                    alt="사진"
                    onclick="openPhoto('${photo.photo_url}')">

                <button
                    type="button"
                    class="danger"
                    onclick="deletePhoto('${photo.id}','${photo.photo_path}')">
                    삭제
                </button>

            </div>
        `;

    });

}
function newForm() {
    const form = document.getElementById("installForm");
    if (form) form.reset();

    const recordId = document.getElementById("recordId");
    if (recordId) recordId.value = "";

    ["installPhotos", "vehiclePhotos", "versionPhotos", "epsPhotos", "cpgPhotos", "acuPhotos"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });

    ["installIssue", "vehicleIssue", "versionIssue", "epsIssue", "cpgIssue", "acuIssue"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

     // 맨 위로 이동
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
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
document
    .getElementById("openConfluenceBtn")
    .addEventListener("click", openConfluence);

document
    .getElementById("linkConfluenceBtn")
    .addEventListener("click", linkConfluence);
document
    .getElementById("importConfluenceBtn")
    .addEventListener("click", importConfluence);    

async function generateConfluence() {
    const recordId = document.getElementById("recordId").value;

    if (!recordId) {
        alert("먼저 저장 후 Confluence 동기화를 진행하세요.");
        return;
    }

    const url = localStorage.getItem("confUrl");
    const email = localStorage.getItem("confEmail");
    const token = localStorage.getItem("confToken");
    const space = localStorage.getItem("confSpace");

    const { data: record, error: recordError } = await supabaseClient
        .from("install_records")
        .select("*")
        .eq("id", recordId)
        .single();

    if (recordError) {
        console.error(recordError);
        alert("장착정보 조회 실패");
        return;
    }

    const { data: photos, error: photoError } = await supabaseClient
        .from("install_photos")
        .select("*")
        .eq("record_id", recordId)
        .order("created_at", { ascending: true });

    if (photoError) {
        console.error(photoError);
        alert("사진 조회 실패");
        return;
    }

    const dateCode = (record.install_date || "")
        .replaceAll("-", "")
        .slice(2);

    const uniqueCode = record.id
        ? record.id.substring(0, 8)
        : Date.now();

   const pageTitle =
    `[${dateCode}] ${record.dealer_region || record.dealer_name || ""} ${record.manufacturer || ""}${record.model_sn || ""}_${record.box_sn || ""}_${uniqueCode}`;

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
                data: record,
                photos: photos || [],
                pageId: record.confluence_page_id || null
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        console.error(result);
        alert("Confluence 동기화 실패");
        return;
    }

  const { data: updateData, error: updateError } = await supabaseClient
    .from("install_records")
    .update({
        confluence_page_id: result.pageId,
        confluence_page_url: result.url,
        confluence_status: true,
        confluence_updated_at: new Date().toISOString()
    })
    .eq("id", recordId)
    .select();

console.log("UPDATE DATA:", updateData);
console.log("UPDATE ERROR:", updateError);

if (updateError) {
    alert("Confluence 정보 저장 실패 : " + updateError.message);
    console.error(updateError);
    return;
}

    alert(
        result.action === "updated"
            ? "Confluence 페이지가 수정되었습니다."
            : "Confluence 페이지가 생성되었습니다."
    );
}

async function openConfluence() {
    const recordId = document.getElementById("recordId").value;

    if (!recordId) {
        alert("먼저 저장된 장착기록을 선택하세요.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("install_records")
        .select("confluence_page_url")
        .eq("id", recordId)
        .single();

    if (error || !data?.confluence_page_url) {
        alert("연결된 Confluence 페이지가 없습니다.");
        return;
    }

    window.open(data.confluence_page_url, "_blank");
}

async function linkConfluence() {

    const recordId = document.getElementById("recordId").value;

    if (!recordId) {
        alert("먼저 저장된 장착기록을 선택하세요.");
        return;
    }

    const input = prompt(
        "Confluence URL 또는 Page ID를 입력하세요."
    );

    if (!input) return;

    let pageId = null;
    let pageUrl = null;

    // URL 입력
    if (input.startsWith("http")) {

        pageUrl = input;

        const match =
            input.match(/pageId=(\d+)/) ||
            input.match(/\/pages\/(\d+)/);

        if (match) {
            pageId = match[1];
        }

    } else {

        // Page ID만 입력
        pageId = input.trim();

        pageUrl =
            `${localStorage.getItem("confUrl")}` +
            `/wiki/pages/viewpage.action?pageId=${pageId}`;
    }

    if (!pageId) {
        alert("Page ID를 찾을 수 없습니다.");
        return;
    }

    const { error } = await supabaseClient
        .from("install_records")
        .update({
            confluence_page_id: pageId,
            confluence_page_url: pageUrl,
            confluence_status: true,
            confluence_updated_at: new Date().toISOString()
        })
        .eq("id", recordId);

    if (error) {
        console.error(error);
        alert("Confluence 연결 실패");
        return;
    }

    alert("Confluence 페이지가 연결되었습니다.");
}

async function importConfluence() {

    const recordId = document.getElementById("recordId").value;

    if (!recordId) {
        alert("먼저 장착기록을 선택하세요.");
        return;
    }

    const url = localStorage.getItem("confUrl");
    const email = localStorage.getItem("confEmail");
    const token = localStorage.getItem("confToken");

    const { data, error } = await supabaseClient
        .from("install_records")
        .select("confluence_page_id")
        .eq("id", recordId)
        .single();

    if (error || !data?.confluence_page_id) {
        alert("연결된 Confluence 페이지가 없습니다.");
        return;
    }

    const response = await fetch(
        "https://istnemevsmoymydfgvwy.supabase.co/functions/v1/import-confluence",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url,
                email,
                token,
                pageId: data.confluence_page_id
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        console.error(result);
        alert("Confluence 가져오기 실패");
        return;
    }

    console.log("가져온 Confluence:", result);
    console.log("제목:", result.title);
    console.log("본문 HTML:", result.html);

    alert("Confluence 가져오기 성공. 콘솔을 확인하세요.");
}

document
.getElementById("saveSettingBtn")
.addEventListener("click", saveConfluenceSetting);

function setDefaultVersions() {
    document.getElementById("ad_a1_software").value = "1.6.2.2";
    document.getElementById("coa_fw").value = "106";
    document.getElementById("ins_ver").value = "1.6.7";
    document.getElementById("moa_fw").value = "1.71.0";
    document.getElementById("cpg_fw").value = "1.0.3.0";
    document.getElementById("adc2").value = "";
    document.getElementById("cpad_sw").value = "1.6.1.9";
}

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
    newForm();
    setDefaultVersions();
});

document
    .getElementById("listNewRecordBtn")
    .addEventListener("click", () => {
        newForm();
        setDefaultVersions();

        document.querySelectorAll(".page").forEach(page => {
            page.classList.add("hidden");
        });

        document.querySelectorAll(".tab").forEach(tab => {
            tab.classList.remove("active");
        });

        document.getElementById("formTab").classList.remove("hidden");
        document.querySelector('[data-tab="form"]').classList.add("active");
    });
document.getElementById("searchInput")
    ?.addEventListener("input", applyRecordFilters);

document.querySelectorAll(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {

        console.log(button.dataset.filter); 

        document.querySelectorAll(".filter-chip").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");
        applyRecordFilters();

    });
});    
document.getElementById("closeViewModal")
    ?.addEventListener("click", () => {
        document.getElementById("viewModal")?.classList.add("hidden");
});
document.getElementById("editViewRecord")
?.addEventListener("click", async () => {

    const id =
        document.getElementById("viewModal").dataset.recordId;

    document.getElementById("viewModal")
        .classList.add("hidden");

    editRecord(id);

});
window.openConfluenceById = async function(recordId) {
    console.log("목록에서 Confluence 열기:", recordId);

    const { data, error } = await supabaseClient
        .from("install_records")
        .select("confluence_page_url")
        .eq("id", recordId)
        .single();

    console.log("Confluence URL:", data, error);

    if (error || !data?.confluence_page_url) {
        alert("연결된 Confluence 페이지가 없습니다.");
        return;
    }

    window.open(data.confluence_page_url, "_blank");
};

window.linkConfluenceById = async function(recordId) {
    console.log("목록에서 Confluence 생성:", recordId);

    document.getElementById("recordId").value = recordId;

    await generateConfluence();
    await loadRecords();
};