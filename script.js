// TIM v2.1
// Tab Controller

let formChanged = false;
let pendingTabName = null;
let monthlyInstallChartInstance = null;

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
        if (tabName === "dashboard") {
    loadDashboard();
}
    }

   tabs.forEach(tab => {

    tab.addEventListener("click", () => {

        const tabName = tab.dataset.tab;

        // 장착등록 탭 자체를 누르는 경우 바로 이동
        if (tabName === "form") {
            showTab(tabName);
            return;
        }

        // 입력한 내용이 없으면 바로 이동
        if (!formChanged) {
            showTab(tabName);
            return;
        }

        // 이동할 탭을 기억하고 저장 확인 모달 표시
        pendingTabName = tabName;

        document
            .getElementById("saveConfirmModal")
            ?.classList.remove("hidden");

    });

});

    showTab("dashboard");
    loadInstallers();
    loadDealers();
    loadManufacturers();

const installForm = document.getElementById("installForm");

installForm?.addEventListener("input", () => {
    formChanged = true;
});

installForm?.addEventListener("change", () => {
    formChanged = true;
});

const saveConfirmModal =
    document.getElementById("saveConfirmModal");

const closeSaveConfirmModal = () => {
    saveConfirmModal?.classList.add("hidden");
};

// 저장 후 이동
document
    .getElementById("saveAndMoveBtn")
    ?.addEventListener("click", async () => {

        try {
            const record = collectFormData();
            const savedRecord = await saveRecord(record);

            if (!savedRecord) {
                return;
            }

            closeSaveConfirmModal();

            if (pendingTabName) {
                const targetTab = pendingTabName;
                pendingTabName = null;
                showTab(targetTab);
            }

        } catch (error) {
            console.error("저장 후 이동 실패:", error);
            alert("저장 중 오류가 발생했습니다.");
        }

    });

// 저장하지 않고 이동
document
    .getElementById("moveWithoutSaveBtn")
    ?.addEventListener("click", () => {

        closeSaveConfirmModal();

        if (pendingTabName) {
            const targetTab = pendingTabName;
            pendingTabName = null;
            showTab(targetTab);
        }

        /*
         * 입력값은 화면에 그대로 유지한다.
         * 다시 장착등록으로 돌아오면 계속 작성할 수 있고,
         * formChanged도 true로 유지된다.
         */
    });

// 이동 취소
document
    .getElementById("cancelMoveBtn")
    ?.addEventListener("click", () => {

        pendingTabName = null;
        closeSaveConfirmModal();

    });

// 초기 상태 설정
toggleMachineSection();

document
    .getElementById("product_name")
    ?.addEventListener("change", toggleMachineSection);

});
function collectFormData() {
    const form = document.getElementById("installForm");

    if (!form) {
        throw new Error("장착등록 폼을 찾을 수 없습니다.");
    }

    const formData = new FormData(form);
    console.log("dealer_type_id =", formData.get("dealer_type_id"));
    console.log("dealer_id      =", formData.get("dealer_id"));

    console.log("FORM DATA:", [...formData.entries()]);
    const recordId =
        document.getElementById("recordId")?.value.trim() || "";

    const productName =
        String(formData.get("product_name") || "").trim();

    const isPlusModel =
        productName === "AD100 PLUS" ||
        productName === "AD100W PLUS";

    const toNullableInteger = (value) => {
        const text = String(value || "").trim();

        if (text === "") {
            return null;
        }

        const number = Number.parseInt(text, 10);

        return Number.isNaN(number) ? null : number;
    };

    const dealerNameInput =
        document.getElementById("dealerName");
    const dealerName =
        String(dealerNameInput?.value || "").trim();
    const dealerOption = [
        ...document.querySelectorAll("#dealerNameList option")
    ].find(option => option.value === dealerName);
    const dealerId = toNullableInteger(
        dealerOption?.dataset.id
    );
    console.log("record 생성 직전:", {
        dealer_type_id: formData.get("dealer_type_id"),
        dealer_id: formData.get("dealer_id")
});
    return {
        id: recordId || undefined,

        // 1. 기본정보
        order_date:
            formData.get("order_date") || null,

        install_date:
            formData.get("install_date") || null,

        install_start_time:
            formData.get("install_start_time") || null,

        install_end_time:
            formData.get("install_end_time") || null,

        // 2. 거래처 정보
        sales_type:
            formData.get("sales_type") || null,

        dealer_name:
            dealerName || null,

        dealer_type_id:
            formData.get("dealer_type_id")
                ? Number(formData.get("dealer_type_id"))
                : null,

        dealer_id:
            dealerId,

representative:
    formData.get("representative") || null,
        // 3. 제품 정보
        product_name:
            productName || null,

        box_sn:
            formData.get("box_sn") || null,

        keypad_sn:
            formData.get("keypad_sn") || null,

        spline:
            formData.get("spline") || null,

        bracket:
            formData.get("bracket") || null,

        rear_camera:
            formData.get("rear_camera") || null,

        // 4. 농기계 1
        machine_type:
            formData.get("machine_type") || null,

        manufacturer:
            formData.get("manufacturer") || null,

        model_sn:
            formData.get("model_sn") || null,

        horsepower:
            toNullableInteger(formData.get("horsepower")),

        machine_number:
            formData.get("machineNumber") || null,

        // 4-2. 농기계 2
        machine_type_2:
            isPlusModel
                ? formData.get("machine_type_2") || null
                : null,

        manufacturer_2:
            isPlusModel
                ? formData.get("manufacturer_2") || null
                : null,

        model_sn_2:
            isPlusModel
                ? formData.get("model_sn_2") || null
                : null,

        horsepower_2:
            isPlusModel
                ? toNullableInteger(formData.get("horsepower_2"))
                : null,

        machine_number_2:
            isPlusModel
                ? formData.get("machineNumber_2") || null
                : null,

        // 5. 고객 및 교육정보
        customer_name:
            formData.get("customer_name") || null,

        customer_phone:
            formData.get("customer_phone") || null,

        customer_address:
            formData.get("customer_address") || null,

        crop_and_scale:
            formData.get("crop_and_scale") || null,

        education_date:
            formData.get("education_date") || null,

        education_staff:
            formData.get("education_staff") || null,

        // 6. 소프트웨어 버전
        ad_a1_software:
            formData.get("ad_a1_software") || null,

        coa_fw:
            formData.get("coa_fw") || null,

        ins_ver:
            formData.get("ins_ver") || null,

        moa_fw:
            formData.get("moa_fw") || null,

        cpg_fw:
            formData.get("cpg_fw") || null,

        adc2:
            formData.get("adc2") || null,

        cpad_sw:
            formData.get("cpad_sw") || null,

        // 7. 작업자 및 이슈
        install_subject:
            formData.get("install_subject") || null,

        installer:
            formData.get("installer") || null,

        major_issue:
            formData.get("major_issue") || null,

        customer_request:
            formData.get("customer_request") || null
    };
}

let recordSaveInProgress = false;
let photoUploadPromise = null;

function setRecordSaveBusy(isBusy) {
    document
        .querySelectorAll('#installForm button[type="submit"], #saveAndMoveBtn')
        .forEach(button => {
            button.disabled = isBusy;
        });

    ["confluenceBtn", "bottomConfluenceBtn"].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.disabled = isBusy;
    });
}

async function saveRecord(record) {
    if (recordSaveInProgress) {
        alert("저장이 진행 중입니다.\n잠시만 기다려주세요.");
        return false;
    }

    if (confluenceSyncInProgress) {
        alert("Confluence 처리가 진행 중입니다.\n완료된 후 저장해 주세요.");
        return false;
    }

    recordSaveInProgress = true;
    setRecordSaveBusy(true);

    try {
    let result;

if (record.id) {
    console.log("UPDATE DATA:", record);
    result = await supabaseClient
        .from("install_records")
        .update(record)
        .eq("id", record.id)
        .select()
        .single();

} else {

    const { id, ...insertRecord } = record;
    console.log("INSERT DATA:", insertRecord);
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

formChanged = false;

alert("저장 완료");
return savedRecord;
    } catch (error) {
        console.error("SAVE ERROR:", error);
        alert(`저장 실패\n${error.message || "알 수 없는 오류가 발생했습니다."}`);
        return false;
    } finally {
        recordSaveInProgress = false;
        setRecordSaveBusy(false);
    }
}

async function uploadTempPhotos(recordId) {
    if (!recordId) return;
    if (photoUploadPromise) return photoUploadPromise;

    photoUploadPromise = uploadQueuedPhotos(recordId);

    try {
        return await photoUploadPromise;
    } finally {
        photoUploadPromise = null;
    }
}

async function uploadQueuedPhotos(recordId) {

    for (const photoType in tempPhotos) {
        while (tempPhotos[photoType].length > 0) {
            const file = tempPhotos[photoType][0];
            const ext = file.name.split(".").pop().toLowerCase();
            const fileName = `${recordId}/${photoType}_${Date.now()}_${crypto.randomUUID()}.${ext}`;

            console.log("UPLOAD FILE:", fileName);
            console.log("BUCKET:", "install-photos");

            const {
                 data: uploadData,
                 error: uploadError
                    } =
            await supabaseClient.storage
             .from("install-photos")
             .upload(fileName, file);

                console.log("UPLOAD DATA:", uploadData);
                console.log("UPLOAD ERROR:", uploadError);

            if (uploadError) {
                console.error(uploadError);
                throw new Error(`사진 업로드 실패: ${uploadError.message}`);
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
                const { error: cleanupError } = await supabaseClient.storage
                    .from("install-photos")
                    .remove([fileName]);

                if (cleanupError) {
                    console.error("PHOTO CLEANUP ERROR:", cleanupError);
                }

                throw new Error("사진 정보 저장 실패");
            }

            tempPhotos[photoType].shift();
        }
    }

    await loadPhotos();
}

function renderTempPhotos(photoType) {
    const photoAreaMap = {
      install: "installPhotos",
      vehicle: "vehiclePhotos",
      machineNumber: "machineNumberPhotos",
      rearCamera: "rearCameraPhotos",
      eps: "epsPhotos",
      cpg: "cpgPhotos",
      acu: "acuPhotos",
      version: "versionPhotos"
};

    const target = document.getElementById(photoAreaMap[photoType]);
    if (!target) return;

    target.innerHTML = "";

    tempPhotos[photoType].forEach((file, index) => {
        const imageUrl = URL.createObjectURL(file);

        target.innerHTML += `
            <div
                class="photo-card photo-card-draggable"
                draggable="true"
                data-photo-kind="temp"
                data-photo-type="${photoType}"
                data-photo-index="${index}"
                title="드래그해 다른 사진 항목으로 이동">
                <img src="${imageUrl}" alt="사진" draggable="false">
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
let filteredRecords = [];
let recordCurrentPage = 1;
let recordPageSize = 10;

async function loadRecords() {
    const { data, error } = await supabaseClient
    .from("install_records")
    .select(`
        *,
        dealer:master_dealers (
            dealer_name,
            dealer_type_id
        )
    `)
    .order("install_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        alert("목록 조회 실패");
        return;
    }

    const { data: photos, error: photoError } = await supabaseClient
        .from("install_photos")
        .select("record_id, photo_type");

    if (photoError) {
        console.error(photoError);
    }

    const photoTypeMap = {};
    const photoSetMap = {};

    (photos || []).forEach(photo => {
        if (!photo.record_id || !photo.photo_type) return;

        if (!photoTypeMap[photo.record_id]) {
            photoTypeMap[photo.record_id] = new Set();
        }

        photoTypeMap[photo.record_id].add(photo.photo_type);

        photoSetMap[photo.record_id] =
            Array.from(photoTypeMap[photo.record_id]);
    });

    console.log("현재 목록", data);

allRecords = (data || []).map(record => ({
    ...record,

    dealer_name:
        record.dealer?.dealer_name ||
        record.dealer_name ||
        "",

    photoCount:
        photoTypeMap[record.id]?.size || 0,

    photoTypes:
        photoSetMap[record.id] || []
}));

    renderYearFilterChips();
    renderMonthFilterOptions();
    applyRecordFilters();
}
function renderRecords(records) {
    const tbody = document.getElementById("recordsBody");

    if (!tbody) return;

    if (!records.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">저장된 데이터가 없습니다.</td>
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

        const photoCount = Number(record.photoCount) || 0;

        // 진행률은 최대 100%로 제한
        const photoPercent = Math.min(
            100,
        Math.round((photoCount / 8) * 100)
        );

        const photoProgressClass = photoPercent === 100
            ? "is-complete"
            : photoPercent >= 50
            ? "is-active"
            : "is-low";
        return `
            <tr class="record-mobile-card">
                <td data-label="장착일">${record.install_date || "-"}</td>
                <td data-label="고객">${record.customer_name || "-"}</td>
                <td data-label="제품 / BOX">
                    ${record.product_name || "-"}<br>
                    <small>BOX: ${record.box_sn || "-"}</small>
                </td>
                <td data-label="농기계">
                    ${record.manufacturer || ""} ${record.model_sn || ""}
                </td>
                <td data-label="사진">
                    <div
                        class="photo-progress ${photoProgressClass}"
                        aria-label="사진 항목 ${photoCount}/8, ${photoPercent}%">
                        <div class="photo-progress-meta">
                            <span class="photo-progress-count">${photoCount}/8</span>
                            <span class="photo-progress-percent">${photoPercent}%</span>
                        </div>
                        <div class="photo-progress-track" aria-hidden="true">
                            <span style="width: ${photoPercent}%"></span>
                        </div>
                    </div>
                </td>
                <td data-label="Confluence">
                    <button
                        type="button"
                        class="secondary"
                        onclick="${confluenceClick}">
                        ${confluenceText}
                    </button>
                </td>

                <td data-label="관리" class="record-actions-cell">
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

function renderRecordPage() {
    const totalRecords = filteredRecords.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordPageSize));

    recordCurrentPage = Math.min(Math.max(1, recordCurrentPage), totalPages);

    const startIndex = (recordCurrentPage - 1) * recordPageSize;
    const pageRecords = filteredRecords.slice(
        startIndex,
        startIndex + recordPageSize
    );

    renderRecords(pageRecords);

    const info = document.getElementById("recordPageInfo");
    if (info) {
        const startNumber = totalRecords ? startIndex + 1 : 0;
        const endNumber = Math.min(startIndex + recordPageSize, totalRecords);
        info.textContent = totalRecords
            ? `${startNumber}–${endNumber} / 총 ${totalRecords}건`
            : "총 0건";
    }

    const previousButton = document.getElementById("recordPrevPage");
    const nextButton = document.getElementById("recordNextPage");

    if (previousButton) previousButton.disabled = recordCurrentPage <= 1;
    if (nextButton) nextButton.disabled = recordCurrentPage >= totalPages;
}

function exportRecordsToExcel() {
    if (!allRecords.length) {
        alert("내보낼 장착 데이터가 없습니다.");
        return;
    }

    const headers = [
        "장착일",
        "고객명",
        "제품명",
        "BOX S/N",
        "제조사",
        "모델명",
        "사진",
        "Confluence"
    ];

    const rows = allRecords.map(record => [
        record.install_date || "",
        record.customer_name || "",
        record.product_name || "",
        record.box_sn || "",
        record.manufacturer || "",
        record.model_sn || "",
        `${record.photoCount || 0}/8`,
        record.confluence_page_url
            ? "동기화 완료"
            : "미동기화"
    ]);

    const csvRows = [
        headers,
        ...rows
    ].map(row =>
        row.map(value => {
            const text = String(value ?? "").replace(/"/g, '""');
            return `"${text}"`;
        }).join(",")
    );

    const csvContent = "\uFEFF" + csvRows.join("\n");

    const blob = new Blob(
        [csvContent],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
        `TYMICT_장착목록_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

function exportRecordsToPdf() {
    if (!allRecords.length) {
        alert("내보낼 장착 데이터가 없습니다.");
        return;
    }

    const rows = allRecords.map(record => `
        <tr>
            <td>${escapeHtml(record.install_date || "-")}</td>
            <td>${escapeHtml(record.customer_name || "-")}</td>
            <td>${escapeHtml(record.product_name || "-")}</td>
            <td>${escapeHtml(record.box_sn || "-")}</td>
            <td>
                ${escapeHtml(record.manufacturer || "")}
                ${escapeHtml(record.model_sn || "")}
            </td>
            <td>${record.photoCount || 0}/8</td>
            <td>
                ${record.confluence_page_url
                    ? "동기화 완료"
                    : "미동기화"}
            </td>
        </tr>
    `).join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("팝업이 차단되었습니다. 팝업을 허용해 주세요.");
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>TYMICT 장착목록</title>

            <style>
                body {
                    font-family: Arial, "Noto Sans KR", sans-serif;
                    padding: 24px;
                    color: #222;
                }

                h1 {
                    margin: 0 0 8px;
                    font-size: 22px;
                }

                .print-date {
                    margin-bottom: 20px;
                    color: #666;
                    font-size: 12px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }

                th,
                td {
                    border: 1px solid #aaa;
                    padding: 7px;
                    text-align: left;
                    vertical-align: top;
                }

                th {
                    background: #eef3f8;
                }

                @page {
                    size: A4 landscape;
                    margin: 12mm;
                }
            </style>
        </head>

        <body>
            <h1>TYMICT 장착목록</h1>

            <div class="print-date">
                출력일: ${new Date().toLocaleDateString("ko-KR")}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>장착일</th>
                        <th>고객명</th>
                        <th>제품명</th>
                        <th>BOX S/N</th>
                        <th>농기계</th>
                        <th>사진</th>
                        <th>Confluence</th>
                    </tr>
                </thead>

                <tbody>
                    ${rows}
                </tbody>
            </table>

            <script>
                window.onload = function () {
                    window.print();
                };
            <\/script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderYearFilterChips() {
    const container = document.getElementById("recordFilter");
    if (!container) return;

    const activeButton = container.querySelector(".filter-chip.active");
    const activeYear = activeButton?.dataset.filter === "year"
        ? activeButton.dataset.year
        : null;

    container
        .querySelectorAll('[data-filter="year"]')
        .forEach(button => button.remove());

    const years = [...new Set(
        allRecords
            .map(record => String(record.install_date || "").slice(0, 4))
            .filter(year => /^\d{4}$/.test(year))
    )].sort((a, b) => Number(b) - Number(a));

    years.forEach(year => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-chip";
        button.dataset.filter = "year";
        button.dataset.year = year;
        button.textContent = `${year}년`;
        container.appendChild(button);
    });

    if (activeYear) {
        const restoredButton = [...container.querySelectorAll('[data-filter="year"]')]
            .find(button => button.dataset.year === activeYear);

        if (restoredButton) {
            container
                .querySelectorAll(".filter-chip")
                .forEach(button => button.classList.remove("active"));
            restoredButton.classList.add("active");
        }
    }
}

function renderMonthFilterOptions() {
    const select = document.getElementById("recordMonthSelect");
    if (!select) return;

    const previousValue = select.value;
    const months = [...new Set(
        allRecords
            .map(record => String(record.install_date || "").slice(0, 7))
            .filter(month => /^\d{4}-\d{2}$/.test(month))
    )].sort((a, b) => b.localeCompare(a));

    select.innerHTML = '<option value="">월별 선택</option>';

    months.forEach(month => {
        const [year, monthNumber] = month.split("-");
        const option = document.createElement("option");
        option.value = month;
        option.textContent = `${year}년 ${Number(monthNumber)}월`;
        select.appendChild(option);
    });

    if (months.includes(previousValue)) {
        select.value = previousValue;
    }
}

function applyRecordFilters(resetPage = true) {
    const keyword =
        document.getElementById("searchInput")?.value.trim().toLowerCase() || "";

    const activeFilter = document.querySelector(".filter-chip.active");
    const filter = activeFilter?.dataset.filter || "all";
    const selectedMonth =
        document.getElementById("recordMonthSelect")?.value || "";

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

    if (selectedMonth) {
        records = records.filter(record =>
            (record.install_date || "").startsWith(selectedMonth)
        );

        filteredRecords = records;
        if (resetPage) recordCurrentPage = 1;
        renderRecordPage();
        return;
    }

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

    if (filter === "year") {
        const year = activeFilter?.dataset.year || "";
        records = records.filter(record =>
            (record.install_date || "").startsWith(`${year}-`)
        );
    }

    filteredRecords = records;
    if (resetPage) recordCurrentPage = 1;
    renderRecordPage();
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

    if (!form) return;

    Object.entries(record).forEach(([key, value]) => {
        const input = form.elements[key];

        if (input) {
            input.value = value ?? "";
        }
    });

    // DB 컬럼명과 HTML name이 다른 항목
    const machineNumber1 = form.elements["machineNumber"];
    if (machineNumber1) {
        machineNumber1.value = record.machine_number ?? "";
    }

    const machineNumber2 = form.elements["machineNumber_2"];
    if (machineNumber2) {
        machineNumber2.value = record.machine_number_2 ?? "";
    }

    const recordIdInput = document.getElementById("recordId");
    if (recordIdInput) {
        recordIdInput.value = record.id ?? "";
    }

    // PLUS 모델 여부에 따라 농기계 2 표시
    toggleMachineSection();

    // 장착직원 버튼 상태 복원
    setInstallerSelection(record.installer);
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
    machineNumber: [],
    rearCamera: [],
    eps: [],
    cpg: [],
    acu: [],
    version: []
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
     machineNumber: "machineNumberPhotos",
     rearCamera: "rearCameraPhotos",
     eps: "epsPhotos",
     cpg: "cpgPhotos",
     acu: "acuPhotos",
     version: "versionPhotos"
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
            <div
                class="photo-card photo-card-draggable"
                draggable="true"
                data-photo-kind="saved"
                data-photo-id="${photo.id}"
                data-photo-type="${photo.photo_type}"
                title="드래그해 다른 사진 항목으로 이동">

                <img
                    src="${photo.photo_url}"
                    alt="사진"
                    draggable="false"
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

let draggedPhoto = null;

document.addEventListener("dragstart", event => {
    const card = event.target.closest(".photo-card-draggable");
    if (!card) return;

    draggedPhoto = {
        kind: card.dataset.photoKind,
        sourceType: card.dataset.photoType,
        index: Number(card.dataset.photoIndex),
        id: card.dataset.photoId || null,
        card
    };

    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "photo-move");
});

document.addEventListener("dragover", event => {
    if (!draggedPhoto) return;

    const targetCard = event.target.closest(".photo-upload-card");
    const targetGrid = targetCard?.querySelector(".photo-grid[data-photo-type]");
    if (targetGrid) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";

        document
            .querySelectorAll(".photo-upload-card.is-drop-target")
            .forEach(card => card.classList.remove("is-drop-target"));
        targetCard.classList.add("is-drop-target");
    }

    const scrollEdge = 100;
    const scrollStep = 18;

    if (event.clientY < scrollEdge) {
        window.scrollBy(0, -scrollStep);
    } else if (window.innerHeight - event.clientY < scrollEdge) {
        window.scrollBy(0, scrollStep);
    }
});

document.addEventListener("drop", async event => {
    const targetCard = event.target.closest(".photo-upload-card");
    const targetGrid = targetCard?.querySelector(".photo-grid[data-photo-type]");
    if (!draggedPhoto || !targetGrid) return;

    event.preventDefault();

    const photo = draggedPhoto;
    const targetType = targetGrid.dataset.photoType;
    const sourceType = photo.sourceType;

    if (targetType !== sourceType) {
        if (photo.kind === "temp") {
            const [file] = tempPhotos[sourceType].splice(photo.index, 1);

            if (file) {
                tempPhotos[targetType].push(file);
                renderTempPhotos(sourceType);
                renderTempPhotos(targetType);
                formChanged = true;
            }
        } else if (photo.kind === "saved" && photo.id) {
            const { data: movedPhoto, error } = await supabaseClient
                .from("install_photos")
                .update({ photo_type: targetType })
                .eq("id", photo.id)
                .select("id, photo_type")
                .single();

            if (error || movedPhoto?.photo_type !== targetType) {
                console.error("사진 분류 이동 실패:", error);
                alert("사진 항목 이동에 실패했습니다.");
            } else {
                photo.card.dataset.photoType = targetType;
                targetGrid.appendChild(photo.card);
            }
        }
    }

    clearPhotoDragState();
});

document.addEventListener("dragend", clearPhotoDragState);

function clearPhotoDragState() {
    draggedPhoto = null;
    document
        .querySelectorAll(".photo-card.is-dragging, .photo-upload-card.is-drop-target")
        .forEach(element => {
            element.classList.remove("is-dragging", "is-drop-target");
        });
}

function newForm() {
    const form = document.getElementById("installForm");
    if (form) form.reset();
    formChanged = false;

    const recordId = document.getElementById("recordId");
    if (recordId) recordId.value = "";

    ["installPhotos", "vehiclePhotos", "machineNumberPhotos", "rearCameraPhotos", "epsPhotos", "cpgPhotos", "acuPhotos", "versionPhotos"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
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
    .getElementById("bottomConfluenceBtn")
    .addEventListener("click", generateConfluence);
document
    .getElementById("openConfluenceBtn")
    .addEventListener("click", openConfluence);

document
    .getElementById("linkConfluenceBtn")
    .addEventListener("click", linkConfluence);
document
    .getElementById("importConfluenceBtn")
    .addEventListener("click", showImportModal);

let confluenceSyncInProgress = false;

async function generateConfluence() {
    if (confluenceSyncInProgress) {
        alert("Confluence 동기화가 진행 중입니다.\n잠시만 기다려주세요.");
        return;
    }

    if (recordSaveInProgress) {
        alert("저장이 진행 중입니다.\n완료된 후 Confluence 처리를 진행해 주세요.");
        return;
    }

    const buttons = [
        document.getElementById("confluenceBtn"),
        document.getElementById("bottomConfluenceBtn")
    ].filter(Boolean);
    const originalTexts = new Map(
        buttons.map(button => [button, button.textContent || "Confluence 생성·수정"])
    );

    confluenceSyncInProgress = true;
    buttons.forEach(button => {
        button.disabled = true;
        button.textContent = "Confluence 처리 중…";
    });

    try {
        await runConfluenceSync();
    } catch (error) {
        console.error("CONFLUENCE SYNC ERROR:", error);
        alert(`Confluence 처리 실패\n${error.message || "알 수 없는 오류가 발생했습니다."}`);
    } finally {
        confluenceSyncInProgress = false;
        buttons.forEach(button => {
            button.disabled = false;
            button.textContent = originalTexts.get(button) || "Confluence 생성·수정";
        });
    }
}

async function runConfluenceSync() {
    const recordId = document.getElementById("recordId").value;

    if (!recordId) {
        alert("먼저 저장 후 Confluence 동기화를 진행하세요.");
        return;
    }

    // 기존 기록에서 새로 선택한 사진을 먼저 저장
    await uploadTempPhotos(recordId);

    const url = localStorage.getItem("confUrl");
    const email = localStorage.getItem("confEmail");
    const token = localStorage.getItem("confToken");
    const space = localStorage.getItem("confSpace");
    const parentPage = localStorage.getItem("confParentPage") || "";

    if (!url || !email || !token) {
        alert(
            "이 기기에 Confluence 설정값이 없습니다.\n\n" +
            "설정 탭에서 URL, 이메일, API Token을 저장한 후 " +
            "다시 동기화해 주세요."
        );
        return;
    }

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

    if (!record.confluence_page_id && !space) {
        alert(
            "이 기기에 Confluence Space Key가 없습니다.\n\n" +
            "설정 탭에서 Space Key를 저장한 후 다시 동기화해 주세요."
        );
        return;
    }

    const { data: photos, error: photoError } = await supabaseClient
        .from("install_photos")
        .select("*")
        .eq("record_id", recordId)
        .order("created_at", { ascending: true });

        console.log("CONFLUENCE RECORD ID:", recordId);
        console.log("CONFLUENCE PHOTOS:", photos);
        console.log("CONFLUENCE PHOTO ERROR:", photoError);

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
    `[${dateCode}] ${record.dealer_region || record.dealer_name || ""} ${record.manufacturer || ""}${record.model_sn || ""}_${record.box_sn || ""}`;
        console.log("SMOOTH-ACTION 전송 사진:", photos);
        console.log(
            "사진 타입:",
    (photos || []).map(photo => photo.photo_type)
);
    let response;

    try {
        response = await fetch(
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
                    pageId: record.confluence_page_id || null,
                    parentPage: record.confluence_page_id ? "" : parentPage
                })
            }
        );
    } catch (error) {
        console.error("Confluence 동기화 네트워크 오류:", error);
        alert(
            "Confluence 동기화 서버에 연결할 수 없습니다.\n\n" +
            "모바일 네트워크를 확인한 후 잠시 뒤 다시 시도해 주세요."
        );
        return;
    }

    const responseText = await response.text();
    let result = null;

    try {
        result = responseText ? JSON.parse(responseText) : {};
    } catch {
        console.error("Confluence 동기화 비정상 응답:", {
            status: response.status,
            contentType: response.headers.get("content-type"),
            body: responseText.slice(0, 500)
        });

        alert(
            "Confluence 동기화 서버가 일시적으로 정상 응답을 주지 않았습니다.\n\n" +
            `HTTP ${response.status}\n` +
            "잠시 뒤 다시 시도해 주세요."
        );
        return;
    }

    if (!response.ok) {
    console.error("Confluence 동기화 오류:", result);

    alert(
        "Confluence 동기화 실패\n\n" +
        (result.error || JSON.stringify(result))
    );

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

async function linkConfluence(recordIdOverride = null) {

    const recordId = typeof recordIdOverride === "string"
        ? recordIdOverride
        : document.getElementById("recordId").value;

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
        } else {
            const url = localStorage.getItem("confUrl");
            const email = localStorage.getItem("confEmail");
            const token = localStorage.getItem("confToken");

            if (!url || !email || !token) {
                alert(
                    "Confluence 단축 URL을 확인할 설정값이 없습니다.\n\n" +
                    "설정 탭에서 URL, 이메일, API Token을 저장하세요."
                );
                return false;
            }

            const response = await fetch(
                "https://istnemevsmoymydfgvwy.supabase.co/functions/v1/import-confluence",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "resolve",
                        url,
                        email,
                        token,
                        pageUrl: input
                    })
                }
            );
            const result = await response.json();

            if (!response.ok || !result.pageId) {
                console.error("Confluence URL 해석 실패:", result);
                alert(
                    "Confluence Page ID를 확인할 수 없습니다.\n\n" +
                    (result.error || `HTTP ${response.status}`)
                );
                return false;
            }

            pageId = result.pageId;
            pageUrl = result.url || input;
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
        return false;
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
        return false;
    }

    alert("Confluence 페이지가 연결되었습니다.");
    return true;
}

async function importConfluence() {
    console.log("가져오기 버튼 클릭됨");
    const input = document
        .getElementById("importConfluenceInput")
        .value
        .trim();

    if (!input) {
        alert("Confluence URL 또는 Page ID를 입력하세요.");
        return;
    }

    let pageId = input;

    // URL이면 Page ID 추출
    if (input.startsWith("http")) {

        const match =
            input.match(/pageId=(\d+)/) ||
            input.match(/\/pages\/(\d+)/);

        if (!match) {
            alert("Page ID를 찾을 수 없습니다.");
            return;
        }

        pageId = match[1];
    }

    const url = localStorage.getItem("confUrl");
    const email = localStorage.getItem("confEmail");
    const token = localStorage.getItem("confToken");

    if (!url || !email || !token) {
        alert(
            "Confluence 설정값이 없습니다.\n\n" +
            "설정 탭에서 URL, 이메일, API Token을 저장한 후 다시 시도하세요."
        );
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
                pageId
            })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        console.error(result);
        alert(
            "Confluence 가져오기 실패\n\n" +
            (result.error || result.message || `HTTP ${response.status}`)
        );
        return;
    }

console.log("IMPORT RESULT:", result);
console.log("ATTACHMENTS:", result.attachments);

const usedAttachmentNames = [
    ...new Set([
        ...[...result.html.matchAll(/ri:filename=["']([^"']+)["']/g)]
            .map(match => match[1]),
        ...[...result.html.matchAll(
            /data-linked-resource-default-alias=["']([^"']+)["']/g
        )].map(match => match[1])
    ])
];

const attachmentByName = new Map(
    (result.attachments || []).map(attachment => [
        attachment.filename,
        attachment
    ])
);

const candidateAttachmentNames = usedAttachmentNames.length > 0
    ? usedAttachmentNames
    : [...attachmentByName.keys()];

const usedAttachments = candidateAttachmentNames.map(filename =>
        attachmentByName.get(filename) || {
            filename,
            mediaType: "image/jpeg",
            fileSize: null,
            downloadPath:
                `/download/attachments/${pageId}/${encodeURIComponent(filename)}`
        }
    )
    .filter(attachment => attachment.downloadPath);

console.log("USED ATTACHMENTS:", usedAttachments);

const data = parseConfluenceTable(result.html);

console.log(data);

const photoMap = parseConfluencePhotos(result.html);

const mappedPhotoCount = Object.values(photoMap)
    .reduce((sum, filenames) => sum + filenames.length, 0);

if (mappedPhotoCount === 0 && usedAttachments.length > 0) {
    photoMap.install = usedAttachments.map(attachment => attachment.filename);
}

console.log(photoMap);

console.log(result.html.match(/ri:attachment[\s\S]{0,300}/g));

const photoImportResult = await importConfluencePhotos({
    attachments: usedAttachments,
    photoMap,
    pageId,
    url,
    email,
    token
});
photoImportResult.references = usedAttachmentNames.length;
photoImportResult.candidates = usedAttachments.length;

const form = document.getElementById("installForm");

const importMap = {
    install_date: ["장착일자", "장착 일자", "장착일"],
    sales_type: ["판매구분", "판매 구분"],
    product_name: ["품명", "제품명"],
    box_sn: ["BOX S/N", "BOX SN"],
    keypad_sn: ["KEYPAD S/N", "KEYPAD SN"],
    representative: ["대표자", "대표"],
    install_subject: ["장착 주체", "장착주체"],
    installer: ["장착 직원", "장착직원"],
    spline: ["스플라인"],
    bracket: ["브라켓"],
    machine_type: ["기종"],
    manufacturer: ["제조사"],
    model_sn: ["모델명 (S/N)", "모델명", "모델"],
    customer_name: ["고객명"],
    customer_phone: ["연락처", "전화번호"],
    customer_address: ["주소"],
    education_date: ["교육 일자", "교육일자"],
    education_staff: ["교육 직원", "교육직원"],
    farm_scale: ["농사 규모", "농사규모"],
    main_crop: ["주요 작물", "주요작물"]
};

Object.entries(importMap).forEach(([fieldName, labels]) => {
    const input = form.elements[fieldName];
    if (!input) return;

    let value = getConfluenceValue(data, labels);

    if (fieldName === "install_date") {
        value = normalizeImportedDate(value);
    }

    if (value) {
        setFormControlValue(input, value);
    }
});

setInstallerSelection(
    getConfluenceValue(data, ["장착 직원", "장착직원", "작업자"])
);

const dealerTypeName = getConfluenceValue(
    data,
    ["거래처 유형", "거래처유형", "딜러 유형", "딜러유형"]
);
const dealerName = getConfluenceValue(
    data,
    ["거래처명", "거래처 명", "딜러점(지역)", "딜러점", "대리점"]
);

if (dealerTypeName) {
    await loadDealers();

    const dealerTypeSelect = form.elements.dealer_type_id;
    setFormControlValue(dealerTypeSelect, dealerTypeName);

    if (dealerTypeSelect.value) {
        await loadDealerNames(dealerTypeSelect.value);
    }
}

if (dealerName) {
    const dealerNameInput = document.getElementById("dealerName");
    if (dealerNameInput) dealerNameInput.value = dealerName;
}

    hideImportModal();

    const photoMessage = photoImportResult.imported > 0
        ? `\n사진 ${photoImportResult.imported}장을 가져왔습니다.`
        : photoImportResult.failed > 0
        ? (
            `\n사진 다운로드 ${photoImportResult.failed}건이 실패했습니다.` +
            `\n본문 참조 ${photoImportResult.references}개, ` +
            `첨부 후보 ${photoImportResult.candidates}개`
        )
        : (
            "\n가져올 사진이 없습니다." +
            `\n본문 참조 ${photoImportResult.references}개, ` +
            `첨부 후보 ${photoImportResult.candidates}개`
        );

    const failedMessage = photoImportResult.imported > 0 && photoImportResult.failed > 0
        ? `\n사진 ${photoImportResult.failed}장은 가져오지 못했습니다.`
        : "";

    alert(
        "Confluence 페이지를 성공적으로 가져왔습니다." +
        photoMessage +
        failedMessage
    );

}
document
.getElementById("saveSettingBtn")
.addEventListener("click", saveConfluenceSetting);

function setDefaultVersions() {
    document.getElementById("ad_a1_software").value = "1.6.2.2";
    document.getElementById("coa_fw").value = "107";
    document.getElementById("ins_ver").value = "1.6.7";
    document.getElementById("moa_fw").value = "1.71.0";
    document.getElementById("cpg_fw").value = "1.0.3.0";
    document.getElementById("adc2").value = "1.4.1";
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

    localStorage.setItem(
        "confParentPage",
        document.getElementById("confParentPage").value.trim()
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

document.getElementById("confParentPage").value =
localStorage.getItem("confParentPage") || "";

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

document.getElementById("recordFilter")
    ?.addEventListener("click", event => {
        const button = event.target.closest(".filter-chip");
        if (!button) return;

        console.log(button.dataset.filter, button.dataset.year || "");

        document.querySelectorAll(".filter-chip").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        const monthSelect = document.getElementById("recordMonthSelect");
        if (monthSelect) monthSelect.value = "";

        applyRecordFilters();
    });
document.getElementById("recordMonthSelect")
    ?.addEventListener("change", event => {
        if (event.target.value) {
            document.querySelectorAll(".filter-chip").forEach(button => {
                button.classList.remove("active");
            });
        } else {
            document
                .querySelector('[data-filter="all"]')
                ?.classList.add("active");
        }

        applyRecordFilters();
    });
document.getElementById("recordPageSize")
    ?.addEventListener("change", event => {
        recordPageSize = Number(event.target.value) || 10;
        recordCurrentPage = 1;
        renderRecordPage();
    });
document.getElementById("recordPrevPage")
    ?.addEventListener("click", () => {
        if (recordCurrentPage <= 1) return;
        recordCurrentPage -= 1;
        renderRecordPage();
    });
document.getElementById("recordNextPage")
    ?.addEventListener("click", () => {
        const totalPages = Math.max(
            1,
            Math.ceil(filteredRecords.length / recordPageSize)
        );

        if (recordCurrentPage >= totalPages) return;
        recordCurrentPage += 1;
        renderRecordPage();
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
    console.log("목록에서 기존 Confluence 연결:", recordId);

    const linked = await linkConfluence(recordId);
    if (linked) await loadRecords();
};
// =============================
// Confluence 가져오기 모달
// =============================

function showImportModal() {
    document
        .getElementById("importModal")
        .classList.remove("hidden");

    document
        .getElementById("importConfluenceInput")
        .value = "";

    document
        .getElementById("importConfluenceInput")
        .focus();
}

function hideImportModal() {
    document
        .getElementById("importModal")
        .classList.add("hidden");
}

document
    .getElementById("cancelImportConfluence")
    .addEventListener("click", hideImportModal);

document
    .getElementById("confirmImportConfluence")
    .addEventListener("click", importConfluence);
function findValue(doc, label) {

    const strongs = doc.querySelectorAll("strong");

    for (const strong of strongs) {

        if (strong.textContent.trim() !== label) continue;

        const td = strong.closest("td");

        if (!td) return "";

        const valueTd = td.nextElementSibling;

        if (!valueTd) return "";

        return valueTd.textContent.trim();
    }

    return "";
}
function normalizeConfluenceLabel(value) {
    return String(value || "")
        .replace(/\s+/g, "")
        .replace(/[：:]/g, "")
        .trim()
        .toLowerCase();
}
function getConfluenceValue(data, labels) {
    const normalizedEntries = Object.entries(data || {}).map(
        ([key, value]) => [normalizeConfluenceLabel(key), String(value || "").trim()]
    );

    for (const label of labels) {
        const normalizedLabel = normalizeConfluenceLabel(label);
        const match = normalizedEntries.find(([key]) => key === normalizedLabel);
        if (match?.[1]) return match[1];
    }

    return "";
}
function normalizeImportedDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";

    const match = text.match(/(?:^|\D)(\d{2}|\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D|$)/);
    if (!match) return text;

    const year = match[1].length === 2
        ? `20${match[1]}`
        : match[1];

    return [
        year,
        match[2].padStart(2, "0"),
        match[3].padStart(2, "0")
    ].join("-");
}
function setFormControlValue(control, value) {
    if (!control || !value) return false;

    if (control.tagName !== "SELECT") {
        control.value = value;
        return true;
    }

    const normalizedValue = normalizeConfluenceLabel(value);
    const option = [...control.options].find(item =>
        normalizeConfluenceLabel(item.value) === normalizedValue ||
        normalizeConfluenceLabel(item.textContent) === normalizedValue
    );

    if (!option) {
        console.warn("가져온 선택값을 찾을 수 없습니다:", value);
        return false;
    }

    control.value = option.value;
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
}
function setInstallerSelection(value) {
    const rawValue = String(value || "").trim();
    const normalizedValue = rawValue.replace(/[\s,\/·]+/g, "");
    const selectedNames = [];

    document
        .querySelectorAll("#installerButtons button")
        .forEach(button => {
            const installerName = String(button.dataset.name || "").trim();
            const isSelected =
                Boolean(installerName) &&
                normalizedValue.includes(
                    installerName.replace(/\s+/g, "")
                );

            button.classList.toggle("active", isSelected);
            if (isSelected) selectedNames.push(installerName);
        });

    const installerInput = document.getElementById("installer");
    if (installerInput) {
        installerInput.value =
            selectedNames.length > 0
                ? selectedNames.join(", ")
                : rawValue;
    }

    return selectedNames;
}
function parseConfluenceTable(html) {

    const doc = new DOMParser().parseFromString(html, "text/html");

    const tables = [...doc.querySelectorAll("table")];

    const result = {};

    tables.forEach(table => {

        const rows = [...table.querySelectorAll("tr")];

        for (let r = 0; r < rows.length - 1; r += 2) {

            const headerCells = [...rows[r].querySelectorAll("td,th")];
            const valueCells = [...rows[r + 1].querySelectorAll("td")];

            headerCells.forEach((cell, i) => {

                const key = cell.textContent
                    .replace(/\s+/g, " ")
                    .trim();

                const value = valueCells[i]
                    ? valueCells[i].textContent.trim()
                    : "";

                if (key) {
                    result[key] = value;
                }

            });

        }

    });

    return result;
}
function parseConfluencePhotos(html) {
    const normalizedHtml = String(html || "");

    const sectionDefinitions = [
        {
            type: "install",
            labels: ["장착사진", "장착 사진", "전체사진", "전체 사진"]
        },
        {
            type: "vehicle",
            labels: [
                "차량제원", "차량 제원", "차량사진", "차량 사진",
                "농기계사진", "농기계 사진"
            ]
        },
        {
            type: "machineNumber",
            labels: ["농기계 기대번호", "기대번호 사진", "기대번호사진"]
        },
        {
            type: "rearCamera",
            labels: ["후방카메라 사진", "후방카메라사진", "후방카메라"]
        },
        {
            type: "version",
            labels: [
                "F/W, S/W 버전", "F/W,S/W 버전", "F/W · S/W 버전",
                "F/W · S/W", "F/W·S/W 버전",
                "버전사진", "버전 사진", "버전정보사진", "버전 정보 사진"
            ]
        },
        {
            type: "eps",
            labels: [
                "EPS부 장착 사진", "EPS부 장착사진", "EPS 장착사진",
                "EPS 장착 사진", "EPS사진", "EPS 사진"
            ]
        },
        {
            type: "cpg",
            labels: [
                "CPG / KEYPAD 장착사진", "CPG/KEYPAD 장착사진",
                "CPG 장착사진", "CPG사진", "CPG 사진"
            ]
        },
        {
            type: "acu",
            labels: [
                "ACU부 부착 사진", "ACU부 부착사진", "ACU 장착사진",
                "ACU 장착 사진", "ACU사진", "ACU 사진"
            ]
        }
    ];

    const result = {
        install: [],
        vehicle: [],
        machineNumber: [],
        rearCamera: [],
        version: [],
        eps: [],
        cpg: [],
        acu: []
    };

    const sectionPositions = [];

    sectionDefinitions.forEach(section => {
        section.labels.forEach(label => {
            let searchIndex = 0;
            let index = normalizedHtml.indexOf(label, searchIndex);

            while (index !== -1) {
                sectionPositions.push({
                    type: section.type,
                    index,
                    length: label.length
                });

                searchIndex = index + label.length;
                index = normalizedHtml.indexOf(label, searchIndex);
            }
        });
    });

    const uniqueSectionPositions = sectionPositions
        .filter((section, index, positions) =>
            !positions.some((other, otherIndex) =>
                otherIndex !== index &&
                other.length > section.length &&
                other.index <= section.index &&
                other.index + other.length >= section.index + section.length
            )
        )
        .sort((a, b) => a.index - b.index || b.length - a.length)
        .filter((section, index, positions) =>
            index === 0 || section.index !== positions[index - 1].index
        );

    for (let i = 0; i < uniqueSectionPositions.length; i++) {
        const current = uniqueSectionPositions[i];
        const next = uniqueSectionPositions[i + 1];

        const sectionHtml = normalizedHtml.slice(
            current.index,
            next ? next.index : normalizedHtml.length
        );

        const filenames = [
            ...sectionHtml.matchAll(/ri:filename="([^"]+)"/g)
        ].map(match => match[1]);

        result[current.type] = [
            ...new Set([
                ...result[current.type],
                ...filenames
            ])
        ];
    }

    const filenameTypeMap = {
        install: "install",
        vehicle: "vehicle",
        machinenumber: "machineNumber",
        rearcamera: "rearCamera",
        eps: "eps",
        cpg: "cpg",
        acu: "acu",
        version: "version"
    };

    const allFilenames = [
        ...normalizedHtml.matchAll(/ri:filename="([^"]+)"/g)
    ].map(match => match[1]);

    allFilenames.forEach(filename => {
        const prefix = filename.match(/^([a-zA-Z]+)_/)?.[1]?.toLowerCase();
        const photoType = filenameTypeMap[prefix];

        if (photoType) {
            Object.values(result).forEach(filenames => {
                const index = filenames.indexOf(filename);
                if (index !== -1) filenames.splice(index, 1);
            });

            result[photoType].push(filename);
        }
    });

    const assignedFilenames = new Set();
    Object.keys(result).forEach(photoType => {
        result[photoType] = result[photoType].filter(filename => {
            if (assignedFilenames.has(filename)) return false;
            assignedFilenames.add(filename);
            return true;
        });
    });

    return result;
}
async function loadInstallers() {
    const container =
        document.getElementById("installerButtons");

    if (!container) return;

    const { data, error } = await supabaseClient
        .from("master_installers")
        .select("id, name")
        .eq("active", true)
        .order("sort_order", { ascending: true });

        console.log("직원 조회 결과:", data);
        console.log("직원 조회 오류:", error);

    if (error) {
        console.error("장착직원 조회 실패:", error);
        container.innerHTML =
            `<span class="empty">직원 목록 조회 실패</span>`;
        return;
    }

    container.innerHTML = (data || [])
        .map(installer => `
            <button
                type="button"
                data-id="${installer.id}"
                data-name="${escapeHtml(installer.name)}">
                ${escapeHtml(installer.name)}
            </button>
        `)
        .join("");

    bindInstallerButtons();
}

function bindInstallerButtons() {
    const buttons =
        document.querySelectorAll("#installerButtons button");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            button.classList.toggle("active");

            const selected =
                [...document.querySelectorAll(
                    "#installerButtons button.active"
                )]
                .map(btn => btn.dataset.name);

            const installerInput =
                document.getElementById("installer");

            if (installerInput) {
                installerInput.value = selected.join(", ");
            }
        });
    });
}
async function importConfluencePhotos({
    attachments,
    photoMap,
    pageId,
    url,
    email,
    token
}) {
    const attachmentMap = new Map(
        attachments.map(item => [item.filename, item])
    );
    let imported = 0;
    let failed = 0;
    const processedFilenames = new Set();

    const photoTypes = [
        "install",
        "vehicle",
        "machineNumber",
        "rearCamera",
        "version",
        "eps",
        "cpg",
        "acu"
    ];

    for (const photoType of photoTypes) {
        const filenames = photoMap[photoType] || [];

        for (const filename of filenames) {
            if (processedFilenames.has(filename)) continue;
            processedFilenames.add(filename);

            const attachment = attachmentMap.get(filename);

            if (!attachment?.downloadPath) {
                console.warn("첨부파일 정보를 찾을 수 없음:", filename);
                failed += 1;
                continue;
            }

            const alreadyImported = tempPhotos[photoType].some(file =>
                file.name === filename &&
                Number(file.size) === Number(attachment.fileSize)
            );

            if (alreadyImported) {
                continue;
            }

            const response = await fetch(
                "https://istnemevsmoymydfgvwy.supabase.co/functions/v1/import-confluence",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        action: "download",
                        url,
                        email,
                        token,
                        pageId,
                        attachmentId: attachment.id || null,
                        downloadPath: attachment.downloadPath
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(
                    "사진 다운로드 실패:",
                    filename,
                    response.status,
                    errorText
                );
                failed += 1;
                continue;
            }

            const blob = await response.blob();

            const file = new File(
                [blob],
                filename,
                {
                    type:
                        attachment.mediaType ||
                        blob.type ||
                        "image/jpeg"
                }
            );

            tempPhotos[photoType].push(file);
            imported += 1;
        }

        renderTempPhotos(photoType);
    }

    console.log("Confluence 사진 가져오기 완료:", tempPhotos);
    return { imported, failed };
}
// =============================
// 제품명에 따라 농기계2 표시
// =============================
function toggleMachineSection() {

    const product = document.getElementById("product_name");
    const machine2 = document.getElementById("machine2Section");

    if (!product || !machine2) return;

    const value = product.value;

    if (
        value === "AD100 PLUS" ||
        value === "AD100W PLUS"
    ) {
        machine2.classList.remove("hidden");
    } else {
        machine2.classList.add("hidden");
    }

}
// =========================================
// Dashboard 2.0
// =========================================

async function loadDashboard() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearSelect = document.getElementById("dashboardYearSelect");

    const { data, error } = await supabaseClient
        .from("install_records")
        .select(`
            id,
            install_date,
            sales_type,
            customer_address,
            customer_name,
            customer_phone,
            product_name,
            manufacturer,
            model_sn,
            confluence_page_id,
            confluence_page_url
        `)
        .order("install_date", { ascending: false, nullsFirst: false });

    if (error) {
        console.error("대시보드 조회 실패:", error);
        return;
    }

    const allDashboardRecords = data || [];
    const availableYears = [...new Set(
        allDashboardRecords
            .map(record => String(record.install_date || "").slice(0, 4))
            .filter(year => /^\d{4}$/.test(year))
    )].sort((a, b) => Number(b) - Number(a));

    const requestedYear = Number(yearSelect?.value) || currentYear;
    const selectedYear = availableYears.includes(String(requestedYear))
        ? requestedYear
        : Number(availableYears[0]) || currentYear;

    if (yearSelect) {
        yearSelect.innerHTML = availableYears
            .map(year => `
                <option value="${year}" ${Number(year) === selectedYear ? "selected" : ""}>
                    ${year}년
                </option>
            `)
            .join("");
    }

    const records = allDashboardRecords.filter(record =>
        String(record.install_date || "").startsWith(`${selectedYear}-`)
    );
    const recordIds = records.map(record => record.id);
    let photos = [];

    if (recordIds.length > 0) {
        const { data: photoData, error: photoError } = await supabaseClient
            .from("install_photos")
            .select("record_id, photo_type")
            .in("record_id", recordIds);

        if (photoError) {
            console.error("대시보드 사진 집계 실패:", photoError);
        } else {
            photos = photoData || [];
        }
    }

    const monthlyCount = new Array(12).fill(0);

    records.forEach(record => {
        const installDate = String(record.install_date || "");
        const month = Number(installDate.substring(5, 7));

        if (month >= 1 && month <= 12) {
            monthlyCount[month - 1] += 1;
        }
    });

    const totalInstallCount = records.length;
    const activeMonthCount = monthlyCount.filter(count => count > 0).length;
    const averageInstallCount = activeMonthCount > 0
        ? (totalInstallCount / activeMonthCount).toFixed(1)
        : "0";
    const photoTypesByRecord = {};

    photos.forEach(photo => {
        if (!photoTypesByRecord[photo.record_id]) {
            photoTypesByRecord[photo.record_id] = new Set();
        }
        if (photo.photo_type) {
            photoTypesByRecord[photo.record_id].add(photo.photo_type);
        }
    });

    const completedPhotoCount = records.filter(record =>
        (photoTypesByRecord[record.id]?.size || 0) >= 8
    ).length;
    const connectedConfluenceCount = records.filter(record =>
        Boolean(record.confluence_page_id || record.confluence_page_url)
    ).length;
    const photoCompletionRate = totalInstallCount > 0
        ? Math.round((completedPhotoCount / totalInstallCount) * 100)
        : 0;
    const confluenceConnectionRate = totalInstallCount > 0
        ? Math.round((connectedConfluenceCount / totalInstallCount) * 100)
        : 0;
    const attention = {
        photoIncomplete: totalInstallCount - completedPhotoCount,
        confluenceUnlinked: totalInstallCount - connectedConfluenceCount,
        customerIncomplete: records.filter(record =>
            !String(record.customer_name || "").trim() ||
            !String(record.customer_phone || "").trim()
        ).length
    };
    const recentRecords = records.slice(0, 5).map(record => ({
        ...record,
        photoCount: photoTypesByRecord[record.id]?.size || 0
    }));

    const salesTypeCount = {
        일반: 0,
        보조: 0,
        B2B: 0,
        기타: 0
    };

    const regionCount = {};
    const productCount = {};
    const manufacturerCount = {};

    records.forEach(record => {
        // 판매구분
        const salesType = String(record.sales_type || "").trim();

        if (
            salesType &&
            Object.prototype.hasOwnProperty.call(
                salesTypeCount,
                salesType
            )
        ) {
            salesTypeCount[salesType] += 1;
        } else {
            salesTypeCount.기타 += 1;
        }

        // 지역
        const region = extractRegion(record.customer_address);

        if (region) {
            regionCount[region] =
                (regionCount[region] || 0) + 1;
        }

        // 제품
        const productName =
            String(record.product_name || "").trim();

        if (productName) {
            productCount[productName] =
                (productCount[productName] || 0) + 1;
        }

        // 제조사
        const manufacturer =
            String(record.manufacturer || "").trim();

        if (manufacturer) {
            manufacturerCount[manufacturer] =
                (manufacturerCount[manufacturer] || 0) + 1;
        }
    });

    updateDashboardUI({
        selectedYear,
        totalInstallCount,
        averageInstallCount,
        photoCompletionRate,
        confluenceConnectionRate,
        attention,
        recentRecords,
        salesTypeCount,
        regionCount,
        productCount,
        manufacturerCount,
        monthlyCount
    });
}

document
    .getElementById("dashboardYearSelect")
    ?.addEventListener("change", loadDashboard);

function extractRegion(address) {
    const normalized = String(address || "")
        .replace(/\s+/g, "")
        .replace(/[()]/g, "")
        .trim();

    if (!normalized) return null;

    const directRegionRules = [
        ["서울특별시", "서울"],
        ["부산광역시", "부산"],
        ["대구광역시", "대구"],
        ["인천광역시", "인천"],
        ["광주광역시", "광주"],
        ["대전광역시", "대전"],
        ["울산광역시", "울산"],
        ["세종특별자치시", "세종"],

        ["경기도", "경기"],
        ["강원특별자치도", "강원"],
        ["강원도", "강원"],
        ["충청북도", "충북"],
        ["충청남도", "충남"],
        ["전북특별자치도", "전북"],
        ["전라북도", "전북"],
        ["전라남도", "전남"],
        ["경상북도", "경북"],
        ["경상남도", "경남"],
        ["제주특별자치도", "제주"],
        ["제주도", "제주"],

        ["서울", "서울"],
        ["부산", "부산"],
        ["대구", "대구"],
        ["인천", "인천"],
        ["대전", "대전"],
        ["울산", "울산"],
        ["세종", "세종"],
        ["경기", "경기"],
        ["강원", "강원"],
        ["충북", "충북"],
        ["충남", "충남"],
        ["전북", "전북"],
        ["전남", "전남"],
        ["경북", "경북"],
        ["경남", "경남"],
        ["제주", "제주"]
    ];

    for (const [keyword, region] of directRegionRules) {
        if (normalized.includes(keyword)) {
            return region;
        }
    }

    const cityRegionMap = {
        경기: [
            "수원", "고양", "용인", "성남", "화성", "부천",
            "남양주", "안산", "평택", "안양", "시흥", "파주",
            "김포", "의정부", "하남", "광명", "군포", "양주",
            "오산", "이천", "안성", "구리", "포천", "의왕",
            "여주", "동두천", "양평", "가평", "연천"
        ],

        강원: [
            "춘천", "원주", "강릉", "동해", "태백", "속초",
            "삼척", "홍천", "횡성", "영월", "평창", "정선",
            "철원", "화천", "양구", "인제", "고성", "양양"
        ],

        충북: [
            "청주", "충주", "제천", "보은", "옥천", "영동",
            "증평", "진천", "괴산", "음성", "단양"
        ],

        충남: [
            "천안", "공주", "보령", "아산", "서산", "논산",
            "계룡", "당진", "금산", "부여", "서천", "청양",
            "홍성", "예산", "태안"
        ],

        전북: [
            "전주", "군산", "익산", "정읍", "남원", "김제",
            "완주", "진안", "무주", "장수", "임실", "순창",
            "고창", "부안"
        ],

        전남: [
            "목포", "여수", "순천", "나주", "광양", "담양",
            "곡성", "구례", "고흥", "보성", "화순", "장흥",
            "강진", "해남", "영암", "무안", "함평", "영광",
            "장성", "완도", "진도", "신안"
        ],

        경북: [
            "포항", "경주", "김천", "안동", "구미", "영주",
            "영천", "상주", "문경", "경산", "의성", "청송",
            "영양", "영덕", "청도", "고령", "성주", "칠곡",
            "예천", "봉화", "울진", "울릉"
        ],

        경남: [
            "창원", "진주", "통영", "사천", "김해", "밀양",
            "거제", "양산", "의령", "함안", "창녕", "고성",
            "남해", "하동", "산청", "함양", "거창", "합천"
        ],

        제주: [
            "제주시", "서귀포"
        ]
    };

    for (const [region, cities] of Object.entries(cityRegionMap)) {
        if (cities.some(city => normalized.includes(city))) {
            return region;
        }
    }

    return null;
}

function updateDashboardUI({
    selectedYear,
    totalInstallCount,
    averageInstallCount,
    photoCompletionRate,
    confluenceConnectionRate,
    attention,
    recentRecords,
    salesTypeCount,
    regionCount,
    productCount,
    manufacturerCount,
    monthlyCount
}) {
    const setText = (id, value) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    setText("dashboardYear", `${selectedYear}년`);
    setText("totalInstallCount", totalInstallCount);
    setText("averageInstallCount", averageInstallCount);
    setText("photoCompletionRate", photoCompletionRate);
    setText("confluenceConnectionRate", confluenceConnectionRate);

    const attentionTarget = document.getElementById("dashboardAttention");
    if (attentionTarget) {
        attentionTarget.innerHTML = [
            ["사진 항목 미완료", attention.photoIncomplete, "photo"],
            ["Confluence 미연결", attention.confluenceUnlinked, "confluence"],
            ["고객정보 확인 필요", attention.customerIncomplete, "customer"]
        ].map(([label, count, type]) => `
            <div class="dashboard-attention-item ${Number(count) === 0 ? "is-clear" : ""}">
                <span class="dashboard-attention-icon ${type}"></span>
                <div><strong>${label}</strong><small>${Number(count) === 0 ? "완료" : "데이터 보완 필요"}</small></div>
                <b>${count}건</b>
            </div>
        `).join("");
    }

    const recentTarget = document.getElementById("dashboardRecent");
    if (recentTarget) {
        recentTarget.innerHTML = recentRecords.length > 0
            ? recentRecords.map(record => `
                <button type="button" class="dashboard-recent-item" onclick="viewRecord('${record.id}')">
                    <span class="dashboard-recent-date">${String(record.install_date || "-").slice(5).replace("-", ".")}</span>
                    <span class="dashboard-recent-main">
                        <strong>${escapeHtml(record.customer_name || "고객명 미입력")}</strong>
                        <small>${escapeHtml([record.manufacturer, record.model_sn].filter(Boolean).join(" ") || record.product_name || "-")}</small>
                    </span>
                    <span class="dashboard-recent-photo">${record.photoCount}/8</span>
                </button>
            `).join("")
            : `<p class="empty">최근 장착 기록이 없습니다.</p>`;
    }

    const salesSummary =
        document.getElementById("salesTypeSummary");

    if (salesSummary) {
        salesSummary.innerHTML = `
            <div>
                <span>일반</span>
                <strong>${salesTypeCount.일반}</strong>
            </div>

            <div>
                <span>보조</span>
                <strong>${salesTypeCount.보조}</strong>
            </div>

            <div>
                <span>B2B</span>
                <strong>${salesTypeCount.B2B}</strong>
            </div>

            <div>
                <span>기타</span>
                <strong>${salesTypeCount.기타}</strong>
            </div>
        `;
    }

    renderDashboardRanking(
        "regionSummary",
        regionCount,
        "지역 데이터가 없습니다."
    );

    renderDashboardRanking(
        "productSummary",
        productCount,
        "제품 데이터가 없습니다."
    );

    renderDashboardRanking(
        "manufacturerSummary",
        manufacturerCount,
        "제조사 데이터가 없습니다."
    );

    drawMonthlyInstallChart(monthlyCount);
}

function drawMonthlyInstallChart(monthlyCount) {
    const canvas = document.getElementById("monthlyInstallChart");

    if (!canvas) return;

    if (typeof Chart === "undefined") {
        console.error("Chart.js가 로드되지 않았습니다.");
        return;
    }

    if (monthlyInstallChartInstance) {
        monthlyInstallChartInstance.destroy();
    }

    monthlyInstallChartInstance = new Chart(canvas, {
        type: "line",

        data: {
            labels: [
                "1월", "2월", "3월", "4월",
                "5월", "6월", "7월", "8월",
                "9월", "10월", "11월", "12월"
            ],

            datasets: [
                {
                    label: "장착대수",
                    data: monthlyCount,
                    borderColor: "#2457a7",
                    backgroundColor: "rgba(36, 87, 167, 0.10)",
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#ffffff",
                    pointBorderColor: "#2457a7",
                    pointBorderWidth: 2
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.raw}대`;
                        }
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    grid: { color: "rgba(148, 163, 184, .18)" },
                    ticks: {
                        precision: 0,
                        stepSize: 1,
                        callback(value) {
                            return `${value}대`;
                        }
                    }
                },

                x: {
                    border: { display: false },
                    grid: {
                        display: false
                    },
                    ticks: { color: "#718096" }
                }
            }
        }
    });
}

function renderDashboardRanking(
    targetId,
    countMap,
    emptyMessage
) {
    const target = document.getElementById(targetId);

    if (!target) return;

    const sortedItems = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1]);

    target.innerHTML = sortedItems.length
        ? sortedItems
            .map(([label, count], index) => `
                <div>
                    <span>
                        <small>${index + 1}</small>
                        ${label}
                    </span>

                    <strong>${count}</strong>
                </div>
            `)
            .join("")
        : `<p class="empty">${emptyMessage}</p>`;
}
document
    .getElementById("exportExcelBtn")
    ?.addEventListener("click", exportRecordsToExcel);

document
    .getElementById("exportPdfBtn")
    ?.addEventListener("click", exportRecordsToPdf);
async function loadDealers() {

    const select =
        document.getElementById("dealerType");

    if (!select) return;

    const { data, error } =
        await supabaseClient
            .from("master_dealer_types")
            .select("id,name")
            .eq("active", true)
            .order("sort_order");

    if (error) {
        console.error(error);
        return;
    }

    select.innerHTML =
        `<option value="">선택</option>`;

    data.forEach(item => {

        select.innerHTML += `
            <option value="${item.id}">
                ${item.name}
            </option>
        `;

    });

}
async function loadDealerNames(typeId) {

    const dealerInput =
        document.getElementById("dealerName");

    const dealerList =
        document.getElementById("dealerNameList");

    if (!dealerInput || !dealerList) return;

    dealerList.innerHTML = "";

    if (!typeId) return;

    const { data, error } =
        await supabaseClient
            .from("master_dealers")
            .select("id, dealer_name")
            .eq("dealer_type_id", typeId)
            .eq("active", true)
            .order("sort_order", { ascending: true });

    if (error) {
        console.error("거래처명 조회 실패:",error);
        return;
    }

    data.forEach(item => {

    dealerList.innerHTML += `
        <option
            value="${escapeHtml(item.dealer_name)}"
            data-id="${item.id}">
    `;

    });
}
async function loadManufacturers() {

    const selects = document.querySelectorAll(
        'select[name="manufacturer"], select[name="manufacturer_2"]'
    );

    if (!selects.length) return;

    const { data, error } = await supabaseClient
        .from("master_manufacturers")
        .select("name")
        .eq("active", true)
        .order("sort_order", { ascending: true });

    console.log("제조사 DATA:", data);

    if (error) {
        console.error("제조사 조회 오류:", error);
        return;
    }

    selects.forEach(select => {

        const currentValue = select.value;

        select.innerHTML =
            `<option value="">선택</option>`;

        data.forEach(item => {

            const option = document.createElement("option");

            option.value = item.name;
            option.textContent = item.name;

            select.appendChild(option);
        });

        if (
            currentValue &&
            data.some(item => item.name === currentValue)
        ) {
            select.value = currentValue;
        }
    });

    console.log("제조사 조회 완료:", data);

}
async function loadModels(manufacturerName, targetListId) {

    const targetList =
        document.getElementById(targetListId);

    if (!targetList) return;

    targetList.innerHTML = "";

    if (!manufacturerName) return;

    const { data, error } = await supabaseClient
        .from("master_models")
        .select(`
            name,
            manufacturer:master_manufacturers!inner(name)
        `)
        .eq("manufacturer.name", manufacturerName)
        .eq("active", true)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("모델 조회 오류:", error);
        return;
    }

    data.forEach(item => {

        const option = document.createElement("option");

        option.value = item.name;

        targetList.appendChild(option);
    });

    console.log("모델 조회 완료:", manufacturerName, data);
}
document
    .getElementById("manufacturerSelect")
    ?.addEventListener("change", (event) => {

        loadModels(
            event.target.value,
            "modelList"
        );

    });

document
    .getElementById("manufacturerSelect2")
    ?.addEventListener("change", (event) => {

        loadModels(
            event.target.value,
            "modelList2"
        );

    });
document
    .getElementById("openAdminLoginBtn")
    .addEventListener("click", () => {
        document
            .getElementById("loginModal")
            .classList.remove("hidden");
    });

document
    .getElementById("closeLoginModalBtn")
    .addEventListener("click", () => {
        document
            .getElementById("loginModal")
            .classList.add("hidden");
    });
async function handleAdminLogin() {
    const email = document
        .getElementById("adminEmail")
        .value
        .trim();

    const password = document
        .getElementById("adminPassword")
        .value;

    if (!email || !password) {
        alert("이메일과 비밀번호를 입력해주세요.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("ADMIN LOGIN ERROR:", error);
        alert("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
    }

    const user = data.user;

    const { data: admin, error: adminError } = await supabaseClient
        .from("master_admins")
        .select("id, email, name, active")
        .eq("email", user.email)
        .eq("active", true)
        .maybeSingle();

    if (adminError) {
        console.error("ADMIN CHECK ERROR:", adminError);
        await supabaseClient.auth.signOut();
        alert("관리자 권한 확인 중 오류가 발생했습니다.");
        return;
    }

    if (!admin) {
        await supabaseClient.auth.signOut();
        alert("관리자 권한이 없습니다.");
        return;
    }

    document
        .getElementById("loginModal")
        .classList.add("hidden");

    document
        .getElementById("adminLoggedOut")
        .classList.add("hidden");

    document
        .getElementById("adminLoggedIn")
        .classList.remove("hidden");

    document.getElementById("adminUserName").textContent =
        admin.name || admin.email;

     showAdminTab();

    alert("관리자 로그인이 완료되었습니다.");
}

document
    .getElementById("adminLoginForm")
    .addEventListener("submit", (event) => {
        event.preventDefault();
        handleAdminLogin();
    });
function showAdminTab() {
    const adminTabButton = document.querySelector('[data-tab="admin"]');

    if (adminTabButton) {
        adminTabButton.classList.remove("hidden");
    }
}

function hideAdminTab() {
    const adminTabButton = document.querySelector('[data-tab="admin"]');

    if (adminTabButton) {
        adminTabButton.classList.add("hidden");
    }

    const adminPage = document.getElementById("adminTab");

    if (adminPage) {
        adminPage.classList.add("hidden");
    }
}
async function handleAdminLogout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("ADMIN LOGOUT ERROR:", error);
        alert("로그아웃 중 오류가 발생했습니다.");
        return;
    }

    document
        .getElementById("adminLoggedOut")
        .classList.remove("hidden");

    document
        .getElementById("adminLoggedIn")
        .classList.add("hidden");

    document.getElementById("adminUserName").textContent = "-";

    hideAdminTab();

    alert("로그아웃되었습니다.");
}

document
    .getElementById("adminLogoutBtn")
    ?.addEventListener("click", handleAdminLogout);
document
    .getElementById("dealerType")
    .addEventListener("change", e => {

        loadDealerNames(e.target.value);

    });
