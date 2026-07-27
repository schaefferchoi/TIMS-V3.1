const MASTER_CONFIG = {

    installers: {
        table: "master_installers",
        title: "장착직원",
        listId: "adminInstallerList",
        inputId: "newInstallerName",
        loadFunction: "loadInstallers"
    },

    dealers: {
        table: "master_dealers",
        title: "거래처",
        listId: "adminDealerList",
        inputId: "newDealerName",
        loadFunction: "loadDealers"
    },

    manufacturers:{
    table:"master_manufacturers",
    title:"제조사",
    listId:"adminManufacturerList",
    inputId:"newManufacturerName",
    loadFunction:"loadManufacturers"
}
};
document.addEventListener("DOMContentLoaded", () => {

    loadAdminInstallers();
    loadAdminDealers();
    loadAdminManufacturers();
    loadAdminManufacturerSelect();
    
    document
    .getElementById("adminModelManufacturer")
    ?.addEventListener("change", (event) => {
        loadAdminModels(event.target.value);
    });
    document
     .getElementById("addModelBtn")
     ?.addEventListener("click", addModel);
    document
        .getElementById("addInstallerBtn")
        ?.addEventListener("click", addInstaller);

    document
        .getElementById("addDealerBtn")
        ?.addEventListener("click", addDealer);
    document
    .getElementById("addManufacturerBtn")
    ?.addEventListener("click", addManufacturer);    
});

async function loadAdminInstallers() {

    const config = MASTER_CONFIG.installers;

    const target =
        document.getElementById(config.listId);

    if (!target) return;

    const { data, error } = await supabaseClient
        .from(config.table)
        .select("id, name, active, sort_order")
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("관리자 직원 목록 조회 실패:", error);
        target.innerHTML =
            `<p class="empty">직원 목록을 불러오지 못했습니다.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        target.innerHTML =
            `<p class="empty">등록된 직원이 없습니다.</p>`;
        return;
    }

    target.innerHTML = `
    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead>
                <tr>
                    <th class="admin-col-order">순서</th>
                    <th>직원명</th>
                    <th class="admin-col-status">상태</th>
                    <th class="admin-col-actions">관리</th>
                </tr>
            </thead>

            <tbody>
                ${data.map(installer => `
                    <tr class="${installer.active ? "" : "admin-row-inactive"}">

                        <td>
                            <div class="admin-order-control">
                                <button
                                    type="button"
                                    class="admin-order-btn"
                                    title="위로 이동"
                                    onclick="moveInstaller(
                                        ${installer.id},
                                        ${installer.sort_order},
                                        -1
                                    )">
                                    ▲
                                </button>

                                <span>
                                    ${installer.sort_order ?? 0}
                                </span>

                                <button
                                    type="button"
                                    class="admin-order-btn"
                                    title="아래로 이동"
                                    onclick="moveInstaller(
                                        ${installer.id},
                                        ${installer.sort_order},
                                        1
                                    )">
                                    ▼
                                </button>
                            </div>
                        </td>

                        <td class="admin-name-cell">
                            ${escapeHtml(installer.name)}
                        </td>

                        <td>
                            <span class="${
                                installer.active
                                    ? "admin-status active"
                                    : "admin-status inactive"
                            }">
                                ${installer.active ? "사용중" : "미사용"}
                            </span>
                        </td>

                        <td>
                            <div class="admin-actions">
                                <button
                                    type="button"
                                    class="secondary"
                                    onclick="editInstaller(${installer.id})">
                                    수정
                                </button>

                                <button
                                    type="button"
                                    class="${
                                        installer.active
                                            ? "danger"
                                            : "secondary"
                                    }"
                                    onclick="toggleInstallerActive(
                                        ${installer.id},
                                        ${installer.active}
                                    )">
                                    ${
                                        installer.active
                                            ? "비활성화"
                                            : "활성화"
                                    }
                                </button>
                            </div>
                        </td>

                    </tr>
                `).join("")}
            </tbody>
        </table>
    </div>
`;
}
async function loadAdminDealers() {

    const config = MASTER_CONFIG.dealers;

    const target =
        document.getElementById(config.listId);

    if (!target) return;

    const { data, error } = await supabaseClient
        .from(config.table)
        .select("id, name, active, sort_order")
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("관리자 거래처 목록 조회 실패:", error);
        target.innerHTML =
            `<p class="empty">거래처 목록을 불러오지 못했습니다.</p>`;
        return;
    }

    if (!data || data.length === 0) {
        target.innerHTML =
            `<p class="empty">등록된 거래처가 없습니다.</p>`;
        return;
    }

    target.innerHTML = `
    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead>
                <tr>
                    <th class="admin-col-order">순서</th>
                    <th>거래처명</th>
                    <th class="admin-col-status">상태</th>
                    <th class="admin-col-actions">관리</th>
                </tr>
            </thead>

            <tbody>
                ${data.map(dealer => `
                    <tr class="${dealer.active ? "" : "admin-row-inactive"}">

                        <td>
                            <div class="admin-order-control">
                                <button
                                    type="button"
                                    class="admin-order-btn"
                                    title="위로 이동"
                                    onclick="moveDealer(
                                        ${dealer.id},
                                        ${dealer.sort_order},
                                        -1
                                    )">
                                    ▲
                                </button>

                                <span>
                                    ${dealer.sort_order ?? 0}
                                </span>

                                <button
                                    type="button"
                                    class="admin-order-btn"
                                    title="아래로 이동"
                                    onclick="moveDealer(
                                        ${dealer.id},
                                        ${dealer.sort_order},
                                        1
                                    )">
                                    ▼
                                </button>
                            </div>
                        </td>

                        <td class="admin-name-cell">
                            ${escapeHtml(dealer.name)}
                        </td>

                        <td>
                            <span class="${
                                dealer.active
                                    ? "admin-status active"
                                    : "admin-status inactive"
                            }">
                                ${dealer.active ? "사용중" : "미사용"}
                            </span>
                        </td>

                        <td>
                            <div class="admin-actions">

                                <button
                                    type="button"
                                    class="secondary"
                                    onclick="editDealer(${dealer.id})">
                                    수정
                                </button>

                                <button
                                    type="button"
                                    class="${
                                        dealer.active
                                            ? "danger"
                                            : "secondary"
                                    }"
                                    onclick="toggleDealerActive(
                                        ${dealer.id},
                                        ${dealer.active}
                                    )">
                                    ${
                                        dealer.active
                                            ? "비활성화"
                                            : "활성화"
                                    }
                                </button>

                            </div>
                        </td>

                    </tr>
                `).join("")}
            </tbody>
        </table>
    </div>
    `;
}

async function loadAdminManufacturers() {

    const config = MASTER_CONFIG.manufacturers;

    const target =
        document.getElementById(config.listId);

    if (!target) return;

    const { data, error } = await supabaseClient
        .from(config.table)
        .select("id, name, active, sort_order")
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("관리자 제조사 목록 조회 실패:", error);

        target.innerHTML =
            `<p class="empty">제조사 목록을 불러오지 못했습니다.</p>`;

        return;
    }

    if (!data || data.length === 0) {
        target.innerHTML =
            `<p class="empty">등록된 제조사가 없습니다.</p>`;

        return;
    }

    target.innerHTML = `
        <div class="admin-table-wrap">
            <table class="admin-table">

                <thead>
                    <tr>
                        <th class="admin-col-order">순서</th>
                        <th>제조사명</th>
                        <th class="admin-col-status">상태</th>
                        <th class="admin-col-actions">관리</th>
                    </tr>
                </thead>

                <tbody>
                    ${data.map(manufacturer => `
                        <tr class="${
                            manufacturer.active
                                ? ""
                                : "admin-row-inactive"
                        }">

                            <td>
                                <div class="admin-order-control">

                                    <button
                                        type="button"
                                        class="admin-order-btn"
                                        title="위로 이동"
                                        onclick="moveManufacturer(
                                            ${manufacturer.id},
                                            ${manufacturer.sort_order},
                                            -1
                                        )">
                                        ▲
                                    </button>

                                    <span>
                                        ${manufacturer.sort_order ?? 0}
                                    </span>

                                    <button
                                        type="button"
                                        class="admin-order-btn"
                                        title="아래로 이동"
                                        onclick="moveManufacturer(
                                            ${manufacturer.id},
                                            ${manufacturer.sort_order},
                                            1
                                        )">
                                        ▼
                                    </button>

                                </div>
                            </td>

                            <td class="admin-name-cell">
                                ${escapeHtml(manufacturer.name)}
                            </td>

                            <td>
                                <span class="${
                                    manufacturer.active
                                        ? "admin-status active"
                                        : "admin-status inactive"
                                }">
                                    ${
                                        manufacturer.active
                                            ? "사용중"
                                            : "미사용"
                                    }
                                </span>
                            </td>

                            <td>
                                <div class="admin-actions">

                                    <button
                                        type="button"
                                        class="secondary"
                                        onclick="editManufacturer(
                                            ${manufacturer.id}
                                        )">
                                        수정
                                    </button>

                                    <button
                                        type="button"
                                        class="${
                                            manufacturer.active
                                                ? "danger"
                                                : "secondary"
                                        }"
                                        onclick="toggleManufacturerActive(
                                            ${manufacturer.id},
                                            ${manufacturer.active}
                                        )">
                                        ${
                                            manufacturer.active
                                                ? "비활성화"
                                                : "활성화"
                                        }
                                    </button>

                                </div>
                            </td>

                        </tr>
                    `).join("")}
                </tbody>

            </table>
        </div>
    `;
}

async function addInstaller() {

    const config = MASTER_CONFIG.installers;

    const input =
        document.getElementById(config.inputId);

    const name = input?.value.trim();

    if (!name) {
        alert("직원명을 입력하세요.");
        input?.focus();
        return;
    }

    let nextOrder;

try {
    nextOrder = await getNextSortOrder(config.table);
} catch (error) {
    console.error("직원 순서 조회 실패:", error);
    alert("직원 추가 준비 중 오류가 발생했습니다.");
    return;
}

    const { error } = await supabaseClient
        .from(config.table)
        .insert({
            name,
            active: true,
            sort_order: nextOrder
        });

    if (error) {
        console.error("직원 추가 실패:", error);
        alert("직원 추가에 실패했습니다.");
        return;
    }

    input.value = "";

    await loadAdminInstallers();

    if (typeof loadInstallers === "function") {
        await loadInstallers();
    }

    alert("직원이 추가되었습니다.");
}

window.editInstaller = async function (id) {

    const config = MASTER_CONFIG.installers;

    const success =
        await editMasterItem(config, id);

    if (!success) return;

    await loadAdminInstallers();

    if (typeof loadInstallers === "function") {
        await loadInstallers();
    }

};
window.toggleInstallerActive = async function (
    id,
    currentActive
) {
    const config = MASTER_CONFIG.installers;

    const success = await toggleMasterItem(
        config,
        id,
        currentActive
    );

    if (!success) return;

    await loadAdminInstallers();

    if (typeof loadInstallers === "function") {
        await loadInstallers();
    }
};
window.moveInstaller = async function (
    id,
    currentOrder,
    direction
) {

    const config = MASTER_CONFIG.installers;

    const success = await moveMasterItem(
        config,
        id,
        currentOrder,
        direction
    );

    if (!success) return;

    await loadAdminInstallers();

    if (typeof loadInstallers === "function") {
        await loadInstallers();
    }

};
async function addDealer() {

    const config = MASTER_CONFIG.dealers;

    const success = await addMasterItem(config);

    if (!success) return;

    await loadAdminDealers();

    if (typeof loadDealers === "function") {
        await loadDealers();
    }

    alert("거래처가 추가되었습니다.");
}
window.editDealer = async function (id) {

    const config = MASTER_CONFIG.dealers;

    const success = await editMasterItem(
        config,
        id
    );

    if (!success) return;

    await loadAdminDealers();

    if (typeof loadDealers === "function") {
        await loadDealers();
    }
};
window.toggleDealerActive = async function (
    id,
    currentActive
) {

    const config = MASTER_CONFIG.dealers;

    const success = await toggleMasterItem(
        config,
        id,
        currentActive
    );

    if (!success) return;

    await loadAdminDealers();

    if (typeof loadDealers === "function") {
        await loadDealers();
    }
};
window.moveDealer = async function (
    id,
    currentOrder,
    direction
) {

    const config = MASTER_CONFIG.dealers;

    const success = await moveMasterItem(
        config,
        id,
        currentOrder,
        direction
    );

    if (!success) return;

    await loadAdminDealers();

    if (typeof loadDealers === "function") {
        await loadDealers();
    }
};
async function addManufacturer() {

    const success =
        await addMasterItem(
            MASTER_CONFIG.manufacturers
        );

    if (!success) return;

    await loadAdminManufacturers();

    if (typeof loadManufacturers === "function") {
        await loadManufacturers();
    }
}
window.editManufacturer = async function (id) {

    const success =
        await editMasterItem(
            MASTER_CONFIG.manufacturers,
            id
        );

    if (!success) return;

    await loadAdminManufacturers();

    if (typeof loadManufacturers === "function") {
        await loadManufacturers();
    }
};
window.toggleManufacturerActive =
async function (id, currentActive) {

    const success =
        await toggleMasterItem(
            MASTER_CONFIG.manufacturers,
            id,
            currentActive
        );

    if (!success) return;

    await loadAdminManufacturers();

    if (typeof loadManufacturers === "function") {
        await loadManufacturers();
    }
};
window.moveManufacturer =
async function (
    id,
    currentOrder,
    direction
) {

    const success =
        await moveMasterItem(
            MASTER_CONFIG.manufacturers,
            id,
            currentOrder,
            direction
        );

    if (!success) return;

    await loadAdminManufacturers();

    if (typeof loadManufacturers === "function") {
        await loadManufacturers();
    }
};
async function loadAdminManufacturerSelect() {

    const select =
        document.getElementById("adminModelManufacturer");

    if (!select) return;

    const { data, error } =
        await supabaseClient
            .from("master_manufacturers")
            .select("name")
            .eq("active", true)
            .order("sort_order");

    if (error) {
        console.error(error);
        return;
    }

    select.innerHTML =
        `<option value="">제조사 선택</option>`;

    data.forEach(item => {

        select.innerHTML += `
            <option value="${item.name}">
                ${item.name}
            </option>
        `;

    });

}
async function loadAdminModels(manufacturerName) {

    const target =
        document.getElementById("adminModelList");

    if (!target) return;

    if (!manufacturerName) {
        target.innerHTML =
            `<p class="empty">제조사를 선택하세요.</p>`;
        return;
    }

    const { data, error } = await supabaseClient
        .from("master_models")
        .select(`
            id,
            name,
            active,
            sort_order,
            manufacturer:master_manufacturers!inner(name)
        `)
        .eq("manufacturer.name", manufacturerName)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("관리자 모델 목록 조회 실패:", error);

        target.innerHTML =
            `<p class="empty">모델 목록을 불러오지 못했습니다.</p>`;

        return;
    }

    if (!data || data.length === 0) {
        target.innerHTML =
            `<p class="empty">등록된 모델이 없습니다.</p>`;
        return;
    }

    target.innerHTML = `
        <div class="admin-table-wrap">
            <table class="admin-table">

                <thead>
                    <tr>
                        <th class="admin-col-order">순서</th>
                        <th>모델명</th>
                        <th class="admin-col-status">상태</th>
                        <th class="admin-col-actions">관리</th>
                    </tr>
                </thead>

                <tbody>
                    ${data.map(model => `
                        <tr class="${model.active ? "" : "admin-row-inactive"}">

                            <td>
                                <div class="admin-order-control">

                                    <button
                                        type="button"
                                        class="admin-order-btn"
                                        onclick="moveModel(
                                            ${model.id},
                                            ${model.sort_order},
                                            -1
                                        )">
                                        ▲
                                    </button>

                                    <span>
                                        ${model.sort_order ?? 0}
                                    </span>

                                    <button
                                        type="button"
                                        class="admin-order-btn"
                                        onclick="moveModel(
                                            ${model.id},
                                            ${model.sort_order},
                                            1
                                        )">
                                        ▼
                                    </button>

                                </div>
                            </td>

                            <td class="admin-name-cell">
                                ${escapeHtml(model.name)}
                            </td>

                            <td>
                                <span class="${
                                    model.active
                                        ? "admin-status active"
                                        : "admin-status inactive"
                                }">
                                    ${model.active ? "사용중" : "미사용"}
                                </span>
                            </td>

                            <td>
                                <div class="admin-actions">

                                    <button
                                        type="button"
                                        class="secondary"
                                        onclick="editModel(${model.id})">
                                        수정
                                    </button>

                                    <button
                                        type="button"
                                        class="${
                                            model.active
                                                ? "danger"
                                                : "secondary"
                                        }"
                                        onclick="toggleModelActive(
                                            ${model.id},
                                            ${model.active}
                                        )">
                                        ${
                                            model.active
                                                ? "비활성화"
                                                : "활성화"
                                        }
                                    </button>

                                </div>
                            </td>

                        </tr>
                    `).join("")}
                </tbody>

            </table>
        </div>
    `;
}
async function addModel() {

    const manufacturerSelect =
        document.getElementById("adminModelManufacturer");

    const modelInput =
        document.getElementById("newModelName");

    const manufacturerName =
        manufacturerSelect?.value;

    const modelName =
        modelInput?.value.trim();

    if (!manufacturerName) {
        alert("제조사를 선택하세요.");
        manufacturerSelect?.focus();
        return;
    }

    if (!modelName) {
        alert("모델명을 입력하세요.");
        modelInput?.focus();
        return;
    }

    const { data: manufacturer, error: manufacturerError } =
        await supabaseClient
            .from("master_manufacturers")
            .select("id")
            .eq("name", manufacturerName)
            .single();

    if (manufacturerError || !manufacturer) {
        console.error(
            "제조사 조회 실패:",
            manufacturerError
        );

        alert("제조사 정보를 찾지 못했습니다.");
        return;
    }

    const { data: lastModels, error: orderError } =
        await supabaseClient
            .from("master_models")
            .select("sort_order")
            .eq(
                "manufacturer_id",
                manufacturer.id
            )
            .order(
                "sort_order",
                { ascending: false }
            )
            .limit(1);

    if (orderError) {
        console.error(
            "모델 순서 조회 실패:",
            orderError
        );

        alert("모델 추가 준비 중 오류가 발생했습니다.");
        return;
    }

    const nextOrder =
        (lastModels?.[0]?.sort_order ?? 0) + 1;

    const { error } =
        await supabaseClient
            .from("master_models")
            .insert({
                manufacturer_id:
                    manufacturer.id,
                name: modelName,
                active: true,
                sort_order: nextOrder
            });

    if (error) {
        console.error("모델 추가 실패:", error);

        if (error.code === "23505") {
            alert("이미 등록된 모델입니다.");
        } else {
            alert("모델 추가에 실패했습니다.");
        }

        return;
    }

    modelInput.value = "";

    await loadAdminModels(
        manufacturerName
    );

    if (typeof loadModels === "function") {

        const manufacturer1 =
            document.getElementById(
                "manufacturerSelect"
            )?.value;

        const manufacturer2 =
            document.getElementById(
                "manufacturerSelect2"
            )?.value;

        if (manufacturer1 === manufacturerName) {
            await loadModels(
                manufacturerName,
                "modelList"
            );
        }

        if (manufacturer2 === manufacturerName) {
            await loadModels(
                manufacturerName,
                "modelList2"
            );
        }
    }

    alert("모델이 추가되었습니다.");
}
window.moveModel = async function (
    id,
    currentOrder,
    direction
) {

    const manufacturerName =
        document.getElementById(
            "adminModelManufacturer"
        )?.value;

    if (!manufacturerName) {
        alert("제조사를 선택하세요.");
        return;
    }

    const targetOrder =
        currentOrder + direction;

    if (targetOrder < 1) {
        return;
    }

    const { data: manufacturer, error: manufacturerError } =
        await supabaseClient
            .from("master_manufacturers")
            .select("id")
            .eq("name", manufacturerName)
            .single();

    if (manufacturerError || !manufacturer) {
        console.error(
            "제조사 조회 실패:",
            manufacturerError
        );

        return;
    }

    const { data: targetModels, error: targetError } =
        await supabaseClient
            .from("master_models")
            .select("id, sort_order")
            .eq(
                "manufacturer_id",
                manufacturer.id
            )
            .eq("sort_order", targetOrder)
            .limit(1);

    if (targetError) {
        console.error(
            "이동 대상 모델 조회 실패:",
            targetError
        );

        return;
    }

    const targetModel =
        targetModels?.[0];

    if (!targetModel) {
        return;
    }

    const temporaryOrder = -1;

    const { error: tempError } =
        await supabaseClient
            .from("master_models")
            .update({
                sort_order: temporaryOrder
            })
            .eq("id", id);

    if (tempError) {
        console.error(
            "현재 모델 임시 이동 실패:",
            tempError
        );

        return;
    }

    const { error: targetUpdateError } =
        await supabaseClient
            .from("master_models")
            .update({
                sort_order: currentOrder
            })
            .eq("id", targetModel.id);

    if (targetUpdateError) {
        console.error(
            "대상 모델 순서 변경 실패:",
            targetUpdateError
        );

        return;
    }

    const { error: currentUpdateError } =
        await supabaseClient
            .from("master_models")
            .update({
                sort_order: targetOrder
            })
            .eq("id", id);

    if (currentUpdateError) {
        console.error(
            "현재 모델 순서 변경 실패:",
            currentUpdateError
        );

        return;
    }

    await loadAdminModels(
        manufacturerName
    );

    if (typeof loadModels === "function") {

        const manufacturer1 =
            document.getElementById(
                "manufacturerSelect"
            )?.value;

        const manufacturer2 =
            document.getElementById(
                "manufacturerSelect2"
            )?.value;

        if (manufacturer1 === manufacturerName) {
            await loadModels(
                manufacturerName,
                "modelList"
            );
        }

        if (manufacturer2 === manufacturerName) {
            await loadModels(
                manufacturerName,
                "modelList2"
            );
        }
    }
};
window.editModel = async function (id) {

    const manufacturerName =
        document.getElementById(
            "adminModelManufacturer"
        )?.value;

    if (!manufacturerName) {
        alert("제조사를 선택하세요.");
        return;
    }

    const { data: model, error: readError } =
        await supabaseClient
            .from("master_models")
            .select("name")
            .eq("id", id)
            .single();

    if (readError || !model) {
        console.error(
            "모델 조회 실패:",
            readError
        );

        alert("모델 정보를 불러오지 못했습니다.");
        return;
    }

    const newName = prompt(
        "수정할 모델명을 입력하세요.",
        model.name
    );

    if (newName === null) {
        return;
    }

    const trimmedName =
        newName.trim();

    if (!trimmedName) {
        alert("모델명을 입력하세요.");
        return;
    }

    if (trimmedName === model.name) {
        return;
    }

    const { error: updateError } =
        await supabaseClient
            .from("master_models")
            .update({
                name: trimmedName
            })
            .eq("id", id);

    if (updateError) {
        console.error(
            "모델 수정 실패:",
            updateError
        );

        if (updateError.code === "23505") {
            alert("같은 제조사에 이미 등록된 모델명입니다.");
        } else {
            alert("모델 수정에 실패했습니다.");
        }

        return;
    }

    await loadAdminModels(
        manufacturerName
    );

    if (typeof loadModels === "function") {

        const manufacturer1 =
            document.getElementById(
                "manufacturerSelect"
            )?.value;

        const manufacturer2 =
            document.getElementById(
                "manufacturerSelect2"
            )?.value;

        if (manufacturer1 === manufacturerName) {
            await loadModels(
                manufacturerName,
                "modelList"
            );
        }

        if (manufacturer2 === manufacturerName) {
            await loadModels(
                manufacturerName,
                "modelList2"
            );
        }
    }

    alert("모델명이 수정되었습니다.");
};
window.toggleModelActive =
async function (id, currentActive) {

    const manufacturerName =
        document.getElementById(
            "adminModelManufacturer"
        )?.value;

    if (!manufacturerName) {
        alert("제조사를 선택하세요.");
        return;
    }

    const { error } =
        await supabaseClient
            .from("master_models")
            .update({
                active: !currentActive
            })
            .eq("id", id);

    if (error) {
        console.error("모델 활성화 변경 실패:", error);
        alert("상태 변경에 실패했습니다.");
        return;
    }

    await loadAdminModels(manufacturerName);

    if (typeof loadModels === "function") {

        const manufacturer1 =
            document.getElementById("manufacturerSelect")?.value;

        const manufacturer2 =
            document.getElementById("manufacturerSelect2")?.value;

        if (manufacturer1 === manufacturerName) {
            await loadModels(
                manufacturerName,
                "modelList"
            );
        }

        if (manufacturer2 === manufacturerName) {
            await loadModels(
                manufacturerName,
                "modelList2"
            );
        }
    }

};