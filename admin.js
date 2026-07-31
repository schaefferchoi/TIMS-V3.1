(function () {
    "use strict";

    const MASTER_CONFIG = {
        installers: {
            table: "master_installers",
            label: "장착직원",
            formLabel: "장착직원명",
            nameColumn: "name",
            activeColumn: "active"
        },
        dealerTypes: {
            table: "master_dealer_types",
            label: "거래처 유형",
            formLabel: "거래처 유형명",
            nameColumn: "name",
            activeColumn: "active"
        },
        dealers: {
            table: "master_dealers",
            label: "거래처명",
            formLabel: "거래처명",
            nameColumn: "dealer_name",
            activeColumn: "active",
            parentTable: "master_dealer_types",
            parentColumn: "dealer_type_id",
            parentNameColumn: "name",
            parentLabel: "거래처 유형"
        },
        manufacturers: {
            table: "master_manufacturers",
            label: "제조사",
            formLabel: "제조사명",
            nameColumn: "name",
            activeColumn: "active"
        },
        models: {
            table: "master_models",
            label: "모델",
            formLabel: "모델명",
            nameColumn: "name",
            activeColumn: "active",
            parentTable: "master_manufacturers",
            parentColumn: "manufacturer_id",
            parentNameColumn: "name",
            parentLabel: "제조사"
        }
    };

    const state = {
        type: "installers",
        items: [],
        parents: [],
        loaded: false,
        admin: null
    };

    const elements = {};

    function escapeHtml(value) {
        const node = document.createElement("div");
        node.textContent = String(value ?? "");
        return node.innerHTML;
    }

    function escapeAttribute(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll('"', "&quot;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    function setMessage(message, isError = false) {
        elements.message.textContent = message;
        elements.message.classList.toggle("error", isError);
    }

    function setBusy(isBusy) {
        elements.form.querySelectorAll("input, select, button").forEach(element => {
            element.disabled = isBusy;
        });
        elements.refresh.disabled = isBusy;
    }

    function ensureAdmin() {
        if (state.admin) return true;
        showAdminLoginRequired();
        return false;
    }

    function resetForm(preserveParent = false) {
        elements.id.value = "";
        elements.name.value = "";
        elements.submit.textContent = "추가";
        elements.cancel.classList.add("hidden");
        if (elements.parent && !preserveParent) elements.parent.value = "";
    }

    function sortItems(items) {
        return [...items].sort((a, b) => {
            const orderDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
            return orderDiff || String(a.name || "").localeCompare(String(b.name || ""), "ko");
        });
    }

    function masterSelect(config) {
        return [
            "id",
            `name:${config.nameColumn}`,
            `is_active:${config.activeColumn}`,
            ...(config.parentColumn ? [config.parentColumn] : []),
            "sort_order"
        ].join(", ");
    }

    function renderList() {
        if (!state.items.length) {
            elements.body.innerHTML = '<tr><td colspan="4" class="empty">등록된 항목이 없습니다.</td></tr>';
            return;
        }

        const config = MASTER_CONFIG[state.type];
        elements.body.innerHTML = state.items.map((item, index) => `
            <tr data-id="${escapeAttribute(item.id)}" class="${item.is_active === false ? "inactive" : ""}">
                <td class="admin-order-cell">
                    <button type="button" data-action="up" aria-label="위로 이동" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" data-action="down" aria-label="아래로 이동" ${index === state.items.length - 1 ? "disabled" : ""}>↓</button>
                </td>
                <td>${escapeHtml(item.name)}</td>
                <td><span class="admin-status ${item.is_active === false ? "off" : "on"}">${item.is_active === false ? "비활성" : "활성"}</span></td>
                <td class="admin-action-cell">
                    <button type="button" data-action="edit">수정</button>
                    <button type="button" data-action="toggle">${item.is_active === false ? "활성화" : "비활성화"}</button>
                    <button type="button" data-action="delete" class="admin-delete-button">삭제</button>
                </td>
            </tr>
        `).join("");
    }

    async function loadMaster(showFeedback = false) {
        if (!ensureAdmin()) return;
        const config = MASTER_CONFIG[state.type];
        elements.body.innerHTML = '<tr><td colspan="4" class="empty">불러오는 중입니다.</td></tr>';
        setMessage("");

        let parentResult = null;
        if (config.parentTable) {
            parentResult = await supabaseClient
                .from(config.parentTable)
                .select(`id, name:${config.parentNameColumn}, is_active:${config.activeColumn}, sort_order`)
                .order("sort_order", { ascending: true });
            if (parentResult.error) {
                console.error(`${config.parentLabel} 조회 실패:`, parentResult.error);
                setMessage(`${config.parentLabel} 조회 실패: ${parentResult.error.message}`, true);
                return;
            }
            state.parents = sortItems(parentResult.data || []);
        } else {
            state.parents = [];
        }

        renderParentOptions();
        let itemQuery = supabaseClient
            .from(config.table)
            .select(masterSelect(config))
            .order("sort_order", { ascending: true });
        if (config.parentColumn) {
            itemQuery = itemQuery.eq(
                config.parentColumn,
                Number(elements.parent.value)
            );
        }
        const itemResult = await itemQuery;
        const { data, error } = itemResult;

        if (error) {
            console.error(`${config.label} 조회 실패:`, error);
            elements.body.innerHTML = '<tr><td colspan="4" class="empty">데이터를 불러오지 못했습니다.</td></tr>';
            setMessage(`${config.label} 조회 실패: ${error.message}`, true);
            return;
        }

        const parentMap = new Map(
            state.parents.map(parent => [String(parent.id), parent.name])
        );
        state.items = sortItems(data || []).map(item => ({
            ...item,
            parent_name: config.parentColumn
                ? parentMap.get(String(item[config.parentColumn])) || ""
                : ""
        }));
        state.loaded = true;
        renderList();
        if (showFeedback) setMessage(`${config.label} 목록을 새로고침했습니다.`);
        refreshInstallFormMasters();
    }

    async function saveItem(event) {
        event.preventDefault();
        if (!ensureAdmin()) return;
        const config = MASTER_CONFIG[state.type];
        const name = elements.name.value.trim();
        const id = elements.id.value;
        const parentId = elements.parent?.value || "";

        if (!name) {
            setMessage(`${config.formLabel}을 입력하세요.`, true);
            elements.name.focus();
            return;
        }
        if (config.parentColumn && !parentId) {
            setMessage(`${config.parentLabel}을 선택하세요.`, true);
            elements.parent.focus();
            return;
        }

        const duplicate = state.items.some(item => {
            const sameItem = String(item.id) === id;
            const sameName =
                String(item.name || "").trim().toLocaleLowerCase() ===
                name.toLocaleLowerCase();
            const sameParent =
                !config.parentColumn ||
                String(item[config.parentColumn] || "") === parentId;
            return !sameItem && sameName && sameParent;
        });
        if (duplicate) {
            setMessage("같은 이름이 이미 등록되어 있습니다.", true);
            return;
        }

        setBusy(true);
        const values = {
            [config.nameColumn]: name,
            ...(config.parentColumn
                ? { [config.parentColumn]: Number(parentId) }
                : {})
        };
        const query = id
            ? supabaseClient
                .from(config.table)
                .update(values)
                .eq("id", id)
            : supabaseClient.from(config.table).insert({
                ...values,
                [config.activeColumn]: true,
                sort_order: state.items.length
            });
        const { error } = await query;
        setBusy(false);

        if (error) {
            console.error(`${config.label} 저장 실패:`, error);
            setMessage(`저장 실패: ${error.message}`, true);
            return;
        }

        resetForm(true);
        await loadMaster();
        setMessage(`${config.label}을 ${id ? "수정" : "추가"}했습니다.`);
    }

    async function toggleItem(item) {
        if (!ensureAdmin()) return;
        const config = MASTER_CONFIG[state.type];
        const nextActive = item.is_active === false;
        const { error } = await supabaseClient
            .from(config.table)
            .update({ [config.activeColumn]: nextActive })
            .eq("id", item.id);

        if (error) {
            console.error(`${config.label} 상태 변경 실패:`, error);
            setMessage(`상태 변경 실패: ${error.message}`, true);
            return;
        }

        await loadMaster();
        setMessage(`${item.name}을(를) ${nextActive ? "활성화" : "비활성화"}했습니다.`);
    }

    async function deleteItem(item) {
        if (!ensureAdmin()) return;
        const config = MASTER_CONFIG[state.type];
        const confirmed = confirm(
            `${config.label} "${item.name}"을(를) 삭제하시겠습니까?\n` +
            "삭제한 항목은 복구할 수 없습니다."
        );
        if (!confirmed) return;

        setMessage("");
        const { error } = await supabaseClient
            .from(config.table)
            .delete()
            .eq("id", item.id);

        if (error) {
            console.error(`${config.label} 삭제 실패:`, error);
            if (error.code === "23503") {
                setMessage(
                    "다른 데이터에서 사용 중인 항목은 삭제할 수 없습니다. 비활성화를 사용하세요.",
                    true
                );
            } else {
                setMessage(`삭제 실패: ${error.message}`, true);
            }
            return;
        }

        if (elements.id.value === String(item.id)) {
            resetForm(true);
        }
        await loadMaster();
        setMessage(`${item.name}을(를) 삭제했습니다.`);
    }

    async function moveItem(index, direction) {
        if (!ensureAdmin()) return;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= state.items.length) return;

        const reordered = [...state.items];
        [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
        const config = MASTER_CONFIG[state.type];
        const results = await Promise.all(reordered.map((item, sortOrder) =>
            supabaseClient.from(config.table).update({ sort_order: sortOrder }).eq("id", item.id)
        ));
        const failed = results.find(result => result.error);

        if (failed) {
            console.error(`${config.label} 순서 변경 실패:`, failed.error);
            setMessage(`순서 변경 실패: ${failed.error.message}`, true);
            await loadMaster();
            return;
        }

        state.items = reordered.map((item, sortOrder) => ({ ...item, sort_order: sortOrder }));
        renderList();
        refreshInstallFormMasters();
        setMessage("표시 순서를 변경했습니다.");
    }

    function handleListClick(event) {
        const config = MASTER_CONFIG[state.type];
        const button = event.target.closest("button[data-action]");
        const row = button?.closest("tr[data-id]");
        if (!button || !row) return;

        const index = state.items.findIndex(item => String(item.id) === row.dataset.id);
        if (index < 0) return;
        const item = state.items[index];

        if (button.dataset.action === "edit") {
            elements.id.value = item.id;
            elements.name.value = item.name;
            if (config.parentColumn) {
                elements.parent.value = String(item[config.parentColumn] || "");
            }
            elements.submit.textContent = "저장";
            elements.cancel.classList.remove("hidden");
            elements.name.focus();
        } else if (button.dataset.action === "toggle") {
            toggleItem(item);
        } else if (button.dataset.action === "delete") {
            deleteItem(item);
        } else if (button.dataset.action === "up") {
            moveItem(index, -1);
        } else if (button.dataset.action === "down") {
            moveItem(index, 1);
        }
    }

    function renderParentOptions() {
        const config = MASTER_CONFIG[state.type];
        const hasParent = Boolean(config.parentColumn);
        elements.parentField.classList.toggle("hidden", !hasParent);
        elements.parentLabel.textContent = config.parentLabel || "분류";

        if (!hasParent) {
            elements.parent.innerHTML = "";
            return;
        }

        const currentValue = elements.parent.value;
        const firstActiveParent = state.parents.find(item =>
            item.is_active !== false
        );
        const selectedValue = state.parents.some(item =>
            String(item.id) === currentValue
        )
            ? currentValue
            : String(firstActiveParent?.id || "");
        elements.parent.innerHTML = '<option value="">선택</option>' +
            state.parents
                .filter(item =>
                    item.is_active !== false ||
                    String(item.id) === selectedValue
                )
                .map(item => `
                    <option value="${escapeAttribute(item.id)}">
                        ${escapeHtml(item.name)}
                    </option>
                `)
                .join("");
        elements.parent.value = selectedValue;
    }

    let dealerItems = [];
    let manufacturerItems = [];
    let modelItems = [];

    function renderDealerNameOptions() {
        const typeSelect = document.getElementById("dealerTypeSelect");
        const nameInput = document.getElementById("dealerNameInput");
        const dealerIdInput = document.getElementById("dealerId");
        const datalist = document.getElementById("dealerNameOptions");
        if (!typeSelect || !nameInput || !dealerIdInput || !datalist) return;

        const selectedTypeId = typeSelect.value;
        const availableDealers = dealerItems.filter(item =>
            item.is_active !== false &&
            (!selectedTypeId || String(item.dealer_type_id || "") === selectedTypeId)
        );

        datalist.innerHTML = availableDealers
            .map(item => `<option value="${escapeAttribute(item.name)}"></option>`)
            .join("");

        const matchedDealer = availableDealers.find(item =>
            item.name === nameInput.value.trim()
        );
        dealerIdInput.value = matchedDealer?.id || "";
    }

    function renderDealerFields(types, dealers) {
        const typeSelect = document.getElementById("dealerTypeSelect");
        const nameInput = document.getElementById("dealerNameInput");
        if (!typeSelect || !nameInput) return;

        const currentTypeId = typeSelect.value;
        dealerItems = dealers;
        typeSelect.innerHTML = '<option value="">선택</option>' + types
            .filter(item =>
                item.is_active !== false ||
                String(item.id) === currentTypeId
            )
            .map(item => `
                <option value="${escapeAttribute(item.id)}">
                    ${escapeHtml(item.name)}
                </option>
            `)
            .join("");
        typeSelect.value = currentTypeId;
        renderDealerNameOptions();
    }

    function renderModelOptions(
        manufacturerSelectId,
        modelSelectId,
        preserveModel = true,
        desiredModel = null
    ) {
        const manufacturerSelect =
            document.getElementById(manufacturerSelectId);
        const modelSelect = document.getElementById(modelSelectId);
        if (!manufacturerSelect || !modelSelect) return;

        const currentModel = desiredModel ?? (
            preserveModel ? modelSelect.value : ""
        );
        const manufacturer = manufacturerItems.find(item =>
            item.name === manufacturerSelect.value
        );
        const availableModels = modelItems.filter(item =>
            item.is_active !== false &&
            manufacturer &&
            String(item.manufacturer_id) === String(manufacturer.id)
        );

        modelSelect.innerHTML = manufacturer
            ? '<option value="">선택</option>' +
                availableModels
                    .map(item => `
                        <option value="${escapeAttribute(item.name)}">
                            ${escapeHtml(item.name)}
                        </option>
                    `)
                    .join("")
            : '<option value="">제조사를 먼저 선택</option>';

        if (
            currentModel &&
            !availableModels.some(item => item.name === currentModel)
        ) {
            modelSelect.insertAdjacentHTML(
                "beforeend",
                `<option value="${escapeAttribute(currentModel)}">${escapeHtml(currentModel)}</option>`
            );
        }
        modelSelect.value = currentModel;
    }

    function renderMachineMasterFields(manufacturers, models) {
        manufacturerItems = manufacturers;
        modelItems = models;

        [
            ["manufacturerSelect", "modelSelect"],
            ["manufacturerSelect2", "modelSelect2"]
        ].forEach(([manufacturerSelectId, modelSelectId]) => {
            const select = document.getElementById(manufacturerSelectId);
            if (!select) return;

            const currentValue = select.value;
            select.innerHTML = '<option value="">선택</option>' +
                manufacturerItems
                    .filter(item =>
                        item.is_active !== false ||
                        item.name === currentValue
                    )
                    .map(item => `
                        <option value="${escapeAttribute(item.name)}">
                            ${escapeHtml(item.name)}
                        </option>
                    `)
                    .join("");
            select.value = currentValue;
            renderModelOptions(
                manufacturerSelectId,
                modelSelectId,
                true
            );
        });
    }

    function renderInstallerButtons(items) {
        const container = document.getElementById("installerButtons");
        const hiddenInput = document.getElementById("installer");
        if (!container || !hiddenInput || !items.length) return;
        const selected = new Set(String(hiddenInput.value || "").split(",").map(value => value.trim()).filter(Boolean));
        container.innerHTML = items
            .filter(item => item.is_active !== false || selected.has(item.name))
            .map(item => `<button type="button" data-name="${escapeAttribute(item.name)}" class="${selected.has(item.name) ? "active" : ""}">${escapeHtml(item.name)}</button>`)
            .join("");
        container.dataset.masterManaged = "true";
    }

    async function refreshInstallFormMasters() {
        const configs = [
            MASTER_CONFIG.installers,
            MASTER_CONFIG.dealers
        ];
        const results = await Promise.all([
            ...configs.map(config =>
                supabaseClient
                    .from(config.table)
                    .select(masterSelect(config))
                    .order("sort_order", { ascending: true })
            ),
            supabaseClient
                .from("master_dealer_types")
                .select("id, name, is_active:active, sort_order")
                .order("sort_order", { ascending: true }),
            supabaseClient
                .from("master_manufacturers")
                .select("id, name, is_active:active, sort_order")
                .order("sort_order", { ascending: true }),
            supabaseClient
                .from("master_models")
                .select("id, name, is_active:active, sort_order, manufacturer_id")
                .order("sort_order", { ascending: true })
        ]);
        if (!results[0].error) renderInstallerButtons(results[0].data || []);
        if (!results[1].error && !results[2].error) {
            renderDealerFields(
                sortItems(results[2].data || []),
                sortItems(results[1].data || [])
            );
        }
        if (!results[3].error && !results[4].error) {
            renderMachineMasterFields(
                sortItems(results[3].data || []),
                sortItems(results[4].data || [])
            );
        }
    }

    function bindInstallerSelection() {
        document.getElementById("installerButtons")?.addEventListener("click", event => {
            if (event.currentTarget.dataset.masterManaged !== "true") return;
            const button = event.target.closest("button[data-name]");
            if (!button) return;
            button.classList.toggle("active");
            document.getElementById("installer").value = [...event.currentTarget.querySelectorAll("button.active")]
                .map(item => item.dataset.name)
                .join(", ");
        });
    }

    function setAuthMessage(message, isError = false) {
        if (!elements.authMessage) return;
        elements.authMessage.textContent = message;
        elements.authMessage.classList.toggle("error", isError);
    }

    function updateAdminSession(admin) {
        state.admin = admin;
        window.isMasterAdmin = Boolean(admin);
        elements.loginForm?.classList.toggle("hidden", Boolean(admin));
        elements.sessionPanel?.classList.toggle("hidden", !admin);
        if (elements.sessionName) {
            elements.sessionName.textContent = admin?.name || "";
        }
        if (!admin) {
            state.loaded = false;
            const adminTab = document.getElementById("adminTab");
            const wasViewingAdmin =
                adminTab && !adminTab.classList.contains("hidden");
            adminTab?.classList.add("hidden");
            if (wasViewingAdmin) {
                document
                    .querySelector('[data-tab="setting"]')
                    ?.click();
            }
        }
    }

    async function verifyAdminUser(user) {
        if (!user?.email) return null;

        const { data, error } = await supabaseClient
            .from("master_admins")
            .select("id, name, active")
            .eq("email", user.email)
            .eq("active", true)
            .maybeSingle();

        if (error) {
            console.error("관리자 권한 확인 실패:", error);
            return null;
        }
        return data || null;
    }

    async function restoreAdminSession() {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error("관리자 세션 확인 실패:", error);
            updateAdminSession(null);
            return;
        }

        const admin = await verifyAdminUser(data.session?.user);
        updateAdminSession(admin);
    }

    async function loginAdmin(event) {
        event.preventDefault();
        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value;
        setAuthMessage("");
        elements.loginButton.disabled = true;

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        elements.loginButton.disabled = false;

        if (error) {
            setAuthMessage("이메일 또는 비밀번호를 확인하세요.", true);
            return;
        }

        const admin = await verifyAdminUser(data.user);
        if (!admin) {
            await supabaseClient.auth.signOut();
            updateAdminSession(null);
            setAuthMessage("마스터 관리 권한이 없는 계정입니다.", true);
            return;
        }

        elements.loginPassword.value = "";
        updateAdminSession(admin);
        setAuthMessage(`${admin.name} 관리자로 로그인했습니다.`);
    }

    async function logoutAdmin() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            setAuthMessage(`로그아웃 실패: ${error.message}`, true);
            return;
        }
        updateAdminSession(null);
        setAuthMessage("로그아웃했습니다.");
    }

    function showAdminLoginRequired() {
        setAuthMessage("마스터 관리 기능을 사용하려면 관리자 로그인이 필요합니다.", true);
        document.getElementById("adminLoginEmail")?.focus();
    }

    function init() {
        elements.body = document.getElementById("adminMasterBody");
        elements.form = document.getElementById("adminMasterForm");
        elements.id = document.getElementById("adminMasterId");
        elements.name = document.getElementById("adminMasterName");
        elements.nameLabel = document.getElementById("adminMasterNameLabel");
        elements.parentField = document.getElementById("adminMasterParentField");
        elements.parent = document.getElementById("adminMasterParent");
        elements.parentLabel = document.getElementById("adminMasterParentLabel");
        elements.submit = document.getElementById("adminMasterSubmit");
        elements.cancel = document.getElementById("adminMasterCancel");
        elements.message = document.getElementById("adminMasterMessage");
        elements.refresh = document.getElementById("adminMasterRefresh");
        elements.loginForm = document.getElementById("adminLoginForm");
        elements.loginEmail = document.getElementById("adminLoginEmail");
        elements.loginPassword = document.getElementById("adminLoginPassword");
        elements.loginButton = document.getElementById("adminLoginButton");
        elements.sessionPanel = document.getElementById("adminSessionPanel");
        elements.sessionName = document.getElementById("adminSessionName");
        elements.logoutButton = document.getElementById("adminLogoutButton");
        elements.authMessage = document.getElementById("adminAuthMessage");
        if (!elements.form || typeof supabaseClient === "undefined") return;

        elements.form.addEventListener("submit", saveItem);
        elements.body.addEventListener("click", handleListClick);
        elements.cancel.addEventListener("click", resetForm);
        elements.parent.addEventListener("change", () => {
            resetForm(true);
            loadMaster();
        });
        elements.refresh.addEventListener("click", () => loadMaster(true));
        elements.loginForm?.addEventListener("submit", loginAdmin);
        elements.logoutButton?.addEventListener("click", logoutAdmin);
        document.querySelectorAll(".admin-master-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                state.type = tab.dataset.master;
                document.querySelectorAll(".admin-master-tab").forEach(item => item.classList.toggle("active", item === tab));
                elements.nameLabel.textContent = MASTER_CONFIG[state.type].formLabel;
                resetForm();
                state.parents = [];
                renderParentOptions();
                loadMaster();
            });
        });
        document.querySelector('[data-tab="admin"]')?.addEventListener("click", () => {
            if (state.admin && !state.loaded) loadMaster();
        });

        bindInstallerSelection();
        document
            .getElementById("dealerTypeSelect")
            ?.addEventListener("change", () => {
                const dealerIdInput = document.getElementById("dealerId");
                if (dealerIdInput) dealerIdInput.value = "";
                renderDealerNameOptions();
            });
        document
            .getElementById("dealerNameInput")
            ?.addEventListener("input", renderDealerNameOptions);
        document
            .getElementById("manufacturerSelect")
            ?.addEventListener("change", () =>
                renderModelOptions(
                    "manufacturerSelect",
                    "modelSelect",
                    false
                )
            );
        document
            .getElementById("manufacturerSelect2")
            ?.addEventListener("change", () =>
                renderModelOptions(
                    "manufacturerSelect2",
                    "modelSelect2",
                    false
                )
            );
        window.refreshMachineModelOptions = (record = null) => {
            renderModelOptions(
                "manufacturerSelect",
                "modelSelect",
                true,
                record?.model_sn || null
            );
            renderModelOptions(
                "manufacturerSelect2",
                "modelSelect2",
                true,
                record?.model_sn_2 || null
            );
        };
        window.isMasterAdmin = false;
        window.showAdminLoginRequired = showAdminLoginRequired;
        supabaseClient.auth.onAuthStateChange(() => {
            setTimeout(restoreAdminSession, 0);
        });
        restoreAdminSession();
        refreshInstallFormMasters();
    }

    document.addEventListener("DOMContentLoaded", init);
}());
