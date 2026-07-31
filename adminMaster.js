async function getNextSortOrder(table) {

    const { data, error } = await supabaseClient
        .from(table)
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);

    if (error) {
        throw error;
    }

    return Number(data?.[0]?.sort_order || 0) + 1;

}
async function addMasterItem(config) {
    const input =
        document.getElementById(config.inputId);

    const name = input?.value.trim();

    if (!name) {
        alert(`${config.title}명을 입력하세요.`);
        input?.focus();
        return false;
    }

    let nextOrder;

    try {
        nextOrder = await getNextSortOrder(config.table);
    } catch (error) {
        console.error(`${config.title} 순서 조회 실패:`, error);
        alert("순서를 가져오지 못했습니다.");
        return false;
    }

    const { error } = await supabaseClient
        .from(config.table)
        .insert({
            name,
            active: true,
            sort_order: nextOrder
        });

    if (error) {
        console.error(`${config.title} 추가 실패:`, error);
        alert(`${config.title} 추가에 실패했습니다.`);
        return false;
    }

    input.value = "";

    return true;
}
async function editMasterItem(config, id) {

    const { data, error } = await supabaseClient
        .from(config.table)
        .select("name")
        .eq("id", id)
        .single();

    if (error) {
        console.error(error);
        alert(`${config.title} 정보를 불러오지 못했습니다.`);
        return false;
    }

    const newName = prompt(
        `${config.title}명을 수정하세요.`,
        data.name
    );

    if (newName === null) return false;

    const name = newName.trim();

    if (!name) {
        alert("이름을 입력하세요.");
        return false;
    }

    const { error: updateError } = await supabaseClient
        .from(config.table)
        .update({
            name
        })
        .eq("id", id);

    if (updateError) {
        console.error(updateError);
        alert(`${config.title} 수정 실패`);
        return false;
    }

    return true;
}
async function toggleMasterItem(config, id, currentActive) {

    const nextActive = !currentActive;

    const message = nextActive
        ? `${config.title}을(를) 다시 활성화하시겠습니까?`
        : `${config.title}을(를) 비활성화하시겠습니까?`;

    if (!confirm(message)) {
        return false;
    }

    const { error } = await supabaseClient
        .from(config.table)
        .update({
            active: nextActive
        })
        .eq("id", id);

    if (error) {
        console.error(`${config.title} 상태 변경 실패:`, error);
        alert(`${config.title} 상태 변경에 실패했습니다.`);
        return false;
    }

    return true;
}
async function deleteMasterItem(config, id) {
    if (!confirm(`${config.title} 항목을 완전히 삭제하시겠습니까?`)) {
        return false;
    }

    const { error } = await supabaseClient
        .from(config.table)
        .delete()
        .eq("id", id);

    if (error) {
        console.error(`${config.title} 삭제 실패:`, error);
        if (error.code === "23503") {
            alert("사용 중인 항목은 삭제할 수 없습니다. 비활성화를 이용해 주세요.");
        } else {
            alert(`${config.title} 삭제에 실패했습니다.`);
        }
        return false;
    }

    return true;
}
async function loadMasterItems(config) {

    const list =
        document.getElementById(config.listId);

    if (!list) {
        console.warn(
            `${config.title} 목록 요소를 찾을 수 없습니다:`,
            config.listId
        );
        return false;
    }

    list.innerHTML = `
        <div class="admin-empty-message">
            불러오는 중...
        </div>
    `;

    const { data, error } = await supabaseClient
        .from(config.table)
        .select("*")
        .order("sort_order", {
            ascending: true
        });

    if (error) {
        console.error(
            `${config.title} 목록 조회 실패:`,
            error
        );

        list.innerHTML = `
            <div class="admin-empty-message">
                목록을 불러오지 못했습니다.
            </div>
        `;

        return false;
    }

    if (!data || data.length === 0) {
        list.innerHTML = `
            <div class="admin-empty-message">
                등록된 ${config.title} 항목이 없습니다.
            </div>
        `;

        return true;
    }

    return data;
}
async function moveMasterItem(config, id, currentOrder, direction) {

    const targetOrder = currentOrder + direction;

    if (targetOrder < 1) {
        return false;
    }

    const { data: target, error: targetError } =
        await supabaseClient
            .from(config.table)
            .select("id, sort_order")
            .eq("sort_order", targetOrder)
            .maybeSingle();

    if (targetError) {
        console.error(targetError);
        return false;
    }

    if (!target) {
        return false;
    }

    const { error: error1 } =
        await supabaseClient
            .from(config.table)
            .update({
                sort_order: targetOrder
            })
            .eq("id", id);

    if (error1) {
        console.error(error1);
        return false;
    }

    const { error: error2 } =
        await supabaseClient
            .from(config.table)
            .update({
                sort_order: currentOrder
            })
            .eq("id", target.id);

    if (error2) {
        console.error(error2);
        return false;
    }

    return true;
}
