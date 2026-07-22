document.addEventListener("DOMContentLoaded", () => {

    loadAdminInstallers();
    loadAdminDealers();

    document
        .getElementById("addInstallerBtn")
        ?.addEventListener("click", addInstaller);

    document
        .getElementById("addDealerBtn")
        ?.addEventListener("click", addDealer);

});

async function loadAdminInstallers() {
    const target =
        document.getElementById("adminInstallerList");

    if (!target) return;

    const { data, error } = await supabaseClient
        .from("master_installers")
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

async function addInstaller() {
    const input =
        document.getElementById("newInstallerName");

    const name = input?.value.trim();

    if (!name) {
        alert("직원명을 입력하세요.");
        input?.focus();
        return;
    }

    const { data: currentData, error: countError } =
        await supabaseClient
            .from("master_installers")
            .select("sort_order")
            .order("sort_order", { ascending: false })
            .limit(1);

    if (countError) {
        console.error("직원 순서 조회 실패:", countError);
        alert("직원 추가 준비 중 오류가 발생했습니다.");
        return;
    }

    const nextOrder =
        Number(currentData?.[0]?.sort_order || 0) + 1;

    const { error } = await supabaseClient
        .from("master_installers")
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
    const currentName =
        document.querySelector(
            `.admin-list-row button[onclick="editInstaller(${id})"]`
        )
        ?.closest(".admin-list-row")
        ?.querySelector(".admin-list-name")
        ?.textContent
        ?.trim();

    const newName = prompt(
        "수정할 직원명을 입력하세요.",
        currentName || ""
    );

    if (!newName?.trim()) return;

    const { error } = await supabaseClient
        .from("master_installers")
        .update({
            name: newName.trim()
        })
        .eq("id", id);

    if (error) {
        console.error("직원명 수정 실패:", error);
        alert("직원명 수정에 실패했습니다.");
        return;
    }

    await loadAdminInstallers();

    if (typeof loadInstallers === "function") {
        await loadInstallers();
    }
};

window.toggleInstallerActive = async function (
    id,
    currentActive
) {
    const nextActive = !currentActive;

    const message = nextActive
        ? "이 직원을 다시 활성화하시겠습니까?"
        : "이 직원을 비활성화하시겠습니까?";

    if (!confirm(message)) return;

    const { error } = await supabaseClient
        .from("master_installers")
        .update({
            active: nextActive
        })
        .eq("id", id);

    if (error) {
        console.error("직원 상태 변경 실패:", error);
        alert("직원 상태 변경에 실패했습니다.");
        return;
    }

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

    const targetOrder =
        currentOrder + direction;

    if (targetOrder < 1) return;

    const { data: target } =
        await supabaseClient
            .from("master_installers")
            .select("id, sort_order")
            .eq("sort_order", targetOrder)
            .maybeSingle();

    if (!target) return;

    await supabaseClient
        .from("master_installers")
        .update({
            sort_order: targetOrder
        })
        .eq("id", id);

    await supabaseClient
        .from("master_installers")
        .update({
            sort_order: currentOrder
        })
        .eq("id", target.id);

    await loadAdminInstallers();

    if (typeof loadInstallers === "function") {
        await loadInstallers();
    }

};