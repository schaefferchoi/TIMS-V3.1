document.addEventListener("DOMContentLoaded", () => {
    loadAdminDealerTypeSelect();
    loadAdminDealerCompanies();

    document
        .getElementById("addDealerCompanyBtn")
        ?.addEventListener("click", addDealerCompany);
});


async function loadAdminDealerTypeSelect() {
    const select = document.getElementById("adminDealerType");

    if (!select) return;

    const { data, error } = await supabaseClient
        .from("master_dealer_types")
        .select("id, name")
        .eq("active", true)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("거래처 유형 조회 실패:", error);
        return;
    }

    select.innerHTML =
        `<option value="">거래처 유형 선택</option>`;

    (data || []).forEach(item => {
        select.innerHTML += `
            <option value="${item.id}">
                ${item.name}
            </option>
        `;
    });
}


async function addDealerCompany() {
    const dealerTypeSelect =
        document.getElementById("adminDealerType");

    const dealerNameInput =
        document.getElementById("newDealerCompany");

    if (!dealerTypeSelect || !dealerNameInput) return;

    const dealerTypeId = Number(dealerTypeSelect.value);
    const dealerName = dealerNameInput.value.trim();

    if (!dealerTypeId) {
        alert("거래처 유형을 선택하세요.");
        return;
    }

    if (!dealerName) {
        alert("거래처명을 입력하세요.");
        dealerNameInput.focus();
        return;
    }

    const { data: duplicate, error: duplicateError } =
        await supabaseClient
            .from("master_dealers")
            .select("id")
            .eq("dealer_type_id", dealerTypeId)
            .eq("dealer_name", dealerName)
            .maybeSingle();

    if (duplicateError) {
        console.error("거래처 중복 확인 실패:", duplicateError);
        alert("거래처 확인 중 오류가 발생했습니다.");
        return;
    }

    if (duplicate) {
        alert("같은 유형에 이미 등록된 거래처입니다.");
        return;
    }

    const { data: lastItem, error: orderError } =
        await supabaseClient
            .from("master_dealers")
            .select("sort_order")
            .eq("dealer_type_id", dealerTypeId)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();

    if (orderError) {
        console.error("거래처 순서 조회 실패:", orderError);
        return;
    }

    const nextSortOrder =
        Number(lastItem?.sort_order || 0) + 1;

    const { error } = await supabaseClient
        .from("master_dealers")
        .insert({
            dealer_type_id: dealerTypeId,
            dealer_name: dealerName,
            active: true,
            sort_order: nextSortOrder
        });

    if (error) {
        console.error("거래처 추가 실패:", error);
        alert("거래처 추가에 실패했습니다.");
        return;
    }

    dealerNameInput.value = "";

    await loadAdminDealerCompanies();

    alert("거래처가 추가되었습니다.");
}


async function loadAdminDealerCompanies() {

    const target =
        document.getElementById("adminDealerCompanyList");

    if (!target) return;

    const { data, error } = await supabaseClient
        .from("master_dealers")
        .select(`
            id,
            dealer_name,
            dealer_type_id,
            active,
            sort_order,
            master_dealer_types (
                name
            )
        `)
        .not("dealer_type_id", "is", null)
        .order("dealer_type_id", { ascending: true })
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
                        <th>거래처 유형</th>
                        <th>거래처명</th>
                        <th class="admin-col-status">상태</th>
                        <th class="admin-col-actions">관리</th>
                    </tr>
                </thead>

                <tbody>
                    ${data.map(dealer => `
                        <tr class="${
                            dealer.active
                                ? ""
                                : "admin-row-inactive"
                        }">

                            <td>
                                <div class="admin-order-control">

                                    <button
                                        type="button"
                                        class="admin-order-btn"
                                        title="위로 이동"
                                        onclick="moveDealerCompany(
                                            ${dealer.id},
                                            ${dealer.dealer_type_id},
                                            ${dealer.sort_order ?? 0},
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
                                        onclick="moveDealerCompany(
                                            ${dealer.id},
                                            ${dealer.dealer_type_id},
                                            ${dealer.sort_order ?? 0},
                                            1
                                        )">
                                        ▼
                                    </button>

                                </div>
                            </td>

                            <td>
                                ${escapeHtml(
                                    dealer.master_dealer_types?.name || "-"
                                )}
                            </td>

                            <td class="admin-name-cell">
                                ${escapeHtml(dealer.dealer_name)}
                            </td>

                            <td>
                                <span class="${
                                    dealer.active
                                        ? "admin-status active"
                                        : "admin-status inactive"
                                }">
                                    ${
                                        dealer.active
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
                                        onclick="editDealerCompany(
                                            ${dealer.id}
                                        )">
                                        수정
                                    </button>

                                    <button
                                        type="button"
                                        class="${
                                            dealer.active
                                                ? "danger"
                                                : "secondary"
                                        }"
                                        onclick="toggleDealerCompanyActive(
                                            ${dealer.id},
                                            ${dealer.active}
                                        )">
                                        ${
                                            dealer.active
                                                ? "비활성화"
                                                : "활성화"
                                        }
                                    </button>
                                    <button type="button" class="danger"
                                        onclick="deleteDealerCompany(${dealer.id})">
                                        삭제
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
async function toggleDealerCompanyActive(id, currentActive) {

    const nextActive = !currentActive;

    const message = nextActive
        ? "이 거래처를 활성화할까요?"
        : "이 거래처를 비활성화할까요?";

    if (!confirm(message)) return;

    const { error } = await supabaseClient
        .from("master_dealers")
        .update({
            active: nextActive
        })
        .eq("id", id);

    if (error) {
        console.error("거래처 상태 변경 실패:", error);
        alert("거래처 상태 변경에 실패했습니다.");
        return;
    }

    await loadAdminDealerCompanies();
}
async function editDealerCompany(id) {

    const { data, error } = await supabaseClient
        .from("master_dealers")
        .select("id, dealer_name")
        .eq("id", id)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    const newName = prompt(
        "거래처명을 수정하세요.",
        data.dealer_name
    );

    if (newName === null) return;

    if (!newName.trim()) {
        alert("거래처명을 입력하세요.");
        return;
    }

    const { error: updateError } =
        await supabaseClient
            .from("master_dealers")
            .update({
                dealer_name: newName.trim()
            })
            .eq("id", id);

    if (updateError) {
        console.error(updateError);
        alert("수정 실패");
        return;
    }

    await loadAdminDealerCompanies();
}
async function deleteDealerCompany(id) {
    const config = { table: "master_dealers", title: "거래처명" };
    if (!await deleteMasterItem(config, id)) return;
    await loadAdminDealerCompanies();
    if (typeof loadDealerCompanies === "function") {
        await loadDealerCompanies();
    }
}
async function moveDealerCompany(
    id,
    dealerTypeId,
    currentOrder,
    direction
) {
    const targetOrder = currentOrder + direction;

    if (targetOrder < 1) return;

    const { data: targetDealer, error: targetError } =
        await supabaseClient
            .from("master_dealers")
            .select("id, sort_order")
            .eq("dealer_type_id", dealerTypeId)
            .eq("sort_order", targetOrder)
            .maybeSingle();

    if (targetError) {
        console.error("이동 대상 거래처 조회 실패:", targetError);
        return;
    }

    if (!targetDealer) return;

    const { error: firstError } =
        await supabaseClient
            .from("master_dealers")
            .update({
                sort_order: targetOrder
            })
            .eq("id", id);

    if (firstError) {
        console.error("거래처 순서 변경 실패:", firstError);
        alert("순서 변경에 실패했습니다.");
        return;
    }

    const { error: secondError } =
        await supabaseClient
            .from("master_dealers")
            .update({
                sort_order: currentOrder
            })
            .eq("id", targetDealer.id);

    if (secondError) {
        console.error("상대 거래처 순서 변경 실패:", secondError);
        alert("순서 변경 중 오류가 발생했습니다.");
        return;
    }

    await loadAdminDealerCompanies();
}
