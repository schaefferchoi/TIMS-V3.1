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

    return {
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
    const { data, error } = await supabaseClient
        .from("install_records")
        .insert([record]);

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

    alert("저장 버튼 클릭됨");

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
                <button class="secondary" type="button">보기</button>
            </td>
        </tr>
    `).join("");
}