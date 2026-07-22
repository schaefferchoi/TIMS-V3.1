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

    const name = prompt(
        `${config.title}명을 수정하세요.`
    );

    if (name === null) return false;

    const newName = name.trim();

    if (!newName) {
        alert("이름을 입력하세요.");
        return false;
    }

    const { error } = await supabaseClient
        .from(config.table)
        .update({
            name: newName
        })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert(`${config.title} 수정 실패`);
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