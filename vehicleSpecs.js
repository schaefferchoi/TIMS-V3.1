(() => {
  const normalize = value => String(value || "")
    .toUpperCase()
    .replace(/[\s_\-/().]/g, "");

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const formatMeters = millimeters => {
    if (millimeters === null || millimeters === undefined || Number.isNaN(millimeters)) {
      return "-";
    }
    return `${(Number(millimeters) / 1000).toFixed(3)} m`;
  };

  const renderDefinitions = target => {
    target.innerHTML = VEHICLE_SPEC_DEFINITIONS.map(item => `
      <div class="vehicle-spec-definition ${item.acuDependent ? "acu-dependent" : ""}">
        <strong>${item.key}</strong>
        <span>${escapeHtml(item.label)}</span>
      </div>
    `).join("");
  };

  const renderEmpty = (target, message, detail) => {
    target.innerHTML = `
      <div class="vehicle-spec-empty">
        <strong>${escapeHtml(message)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    `;
  };

  const renderResult = spec => {
    const availableCount = VEHICLE_SPEC_DEFINITIONS
      .filter(item => spec[item.key.toLowerCase()] !== null)
      .length;
    const statusClass = availableCount === VEHICLE_SPEC_DEFINITIONS.length
      ? "complete"
      : "incomplete";
    const statusText = availableCount === VEHICLE_SPEC_DEFINITIONS.length
      ? "제원 등록 완료"
      : `${availableCount}/9 항목 등록`;

    return `
      <article class="vehicle-spec-result">
        <header class="vehicle-spec-result-header">
          <div>
            <span>${escapeHtml(spec.manufacturer)} · ${escapeHtml(spec.category)}</span>
            <h3>${escapeHtml(spec.model)}</h3>
          </div>
          <span class="vehicle-spec-status ${statusClass}">${statusText}</span>
        </header>
        <div class="vehicle-spec-values">
          ${VEHICLE_SPEC_DEFINITIONS.map(item => {
            const value = spec[item.key.toLowerCase()];
            return `
              <div class="vehicle-spec-value ${value === null ? "missing" : ""} ${item.acuDependent ? "acu-dependent" : ""}">
                <div class="vehicle-spec-key">${item.key}</div>
                <div>
                  <strong>${formatMeters(value)}</strong>
                  <span>${escapeHtml(item.label)}${item.acuDependent ? " · ACU 위치 변경 시 재측정" : ""}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    `;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("vehicleSpecSearch");
    const clearButton = document.getElementById("clearVehicleSpecSearch");
    const suggestions = document.getElementById("vehicleSpecSuggestions");
    const summary = document.getElementById("vehicleSpecSummary");
    const results = document.getElementById("vehicleSpecResults");
    const definitions = document.getElementById("vehicleSpecDefinitions");
    const sourceLink = document.getElementById("vehicleSpecSourceLink");

    if (!input || !results || !summary) return;

    sourceLink.href = VEHICLE_SPEC_SOURCE;
    suggestions.innerHTML = VEHICLE_SPEC_DATA.map(spec => `
      <option value="${escapeHtml(`${spec.manufacturer} ${spec.model}`)}"></option>
    `).join("");
    renderDefinitions(definitions);

    const search = () => {
      const query = normalize(input.value);
      if (!query) {
        summary.textContent = `${VEHICLE_SPEC_DATA.length}개 기종의 기본 제원 데이터`;
        renderEmpty(results, "기종을 검색해 주세요.", "제조사 또는 모델명의 일부만 입력해도 검색됩니다.");
        return;
      }

      const matches = VEHICLE_SPEC_DATA.filter(spec => {
        const target = normalize(`${spec.manufacturer}${spec.model}${spec.category}`);
        return target.includes(query);
      });

      summary.textContent = matches.length > 0
        ? `${matches.length}개 기종 검색됨`
        : "검색 결과 없음";

      if (matches.length === 0) {
        renderEmpty(results, "일치하는 기종이 없습니다.", "다른 제조사명이나 모델명으로 검색해 주세요.");
        return;
      }

      results.innerHTML = matches.slice(0, 20).map(renderResult).join("");
      if (matches.length > 20) {
        results.insertAdjacentHTML(
          "beforeend",
          '<p class="vehicle-spec-more">결과가 많습니다. 모델명을 더 구체적으로 입력해 주세요.</p>'
        );
      }
    };

    input.addEventListener("input", search);
    input.addEventListener("search", search);
    clearButton.addEventListener("click", () => {
      input.value = "";
      input.focus();
      search();
    });

    search();
  });
})();
