(() => {
  const FORM_VERSION = "2026-07-31";
  const STORAGE_BUCKET = "consent-signatures";
  const STEP_LABELS = ["기본정보", "필수 동의", "선택 동의", "제3자·광고", "확인·서명"];
  let currentStep = 0;
  let signatureDrawn = false;
  let lastSubmittedConsent = null;
  let consentRecords = [];
  let consentPage = 1;
  let consentPageSize = 10;

  const $ = id => document.getElementById(id);
  const selectedBoolean = name =>
    document.querySelector(`input[name="${name}"]:checked`)?.value === "true";
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  const formatDate = value => {
    const date = value ? new Date(value) : new Date();
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(date);
  };

  function collectConsentData() {
    const channels = [];
    if ($("consentChannelPhone")?.checked) channels.push("전화");
    if ($("consentChannelMessage")?.checked) channels.push("문자(SMS/LMS/MMS)");

    return {
      customer_name: $("consentName").value.trim(),
      phone: $("consentPhone").value.trim(),
      address: $("consentAddress").value.trim(),
      owned_brand: $("consentBrand").value.trim() || null,
      owned_product: $("consentProduct").value.trim() || null,
      owned_count: Number($("consentCount").value || 0),
      is_over_14: $("consentAge").checked,
      required_collection_agreed: $("consentRequired").checked,
      optional_collection_agreed: selectedBoolean("optional_collection"),
      third_party_agreed: selectedBoolean("third_party"),
      marketing_agreed: selectedBoolean("marketing"),
      marketing_channels: channels,
      form_version: FORM_VERSION,
      install_record_id: $("recordId")?.value || null
    };
  }

  function renderReview() {
    const data = collectConsentData();
    $("consentReview").innerHTML = [
      ["성명", data.customer_name || "-"],
      ["연락처", data.phone || "-"],
      ["주소", data.address || "-"],
      ["보유 제품", [data.owned_brand, data.owned_product].filter(Boolean).join(" · ") || "-"],
      ["필수 수집·이용", data.required_collection_agreed ? "동의" : "미동의"],
      ["선택 수집·이용", data.optional_collection_agreed ? "동의" : "미동의"],
      ["제3자 제공", data.third_party_agreed ? "동의" : "미동의"],
      ["광고성 정보", data.marketing_agreed ? `동의 (${data.marketing_channels.join(", ") || "수단 미선택"})` : "미동의"]
    ].map(([label, value]) => `<div><strong>${label}</strong>${escapeHtml(value)}</div>`).join("");
  }

  function updateStep() {
    const steps = [...document.querySelectorAll(".consent-step")];
    steps.forEach((step, index) => step.classList.toggle("active", index === currentStep));
    $("consentPrev").disabled = currentStep === 0;
    $("consentNext").classList.toggle("hidden", currentStep === steps.length - 1);
    $("consentStepLabel").textContent = `${currentStep + 1} / ${steps.length} ${STEP_LABELS[currentStep]}`;
    $("consentProgressBar").style.background =
      `linear-gradient(90deg, var(--p2) ${(currentStep + 1) / steps.length * 100}%, #e5ebf2 0)`;
    if (currentStep === steps.length - 1) {
      renderReview();
      requestAnimationFrame(resizeSignatureCanvas);
    }
    window.scrollTo({ top: $("consentTab").offsetTop, behavior: "smooth" });
  }

  function validateStep(index) {
    const step = document.querySelector(`.consent-step[data-consent-step="${index}"]`);
    const invalid = [...step.querySelectorAll("input[required]")].find(input => !input.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      invalid.focus();
      return false;
    }
    return true;
  }

  function resizeSignatureCanvas() {
    const canvas = $("consentSignature");
    if (!canvas || !canvas.parentElement.clientWidth) return;
    const existing = signatureDrawn ? canvas.toDataURL("image/png") : null;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#17212b";
    if (existing) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, canvas.clientWidth, canvas.clientHeight);
      image.src = existing;
    }
  }

  function setupSignaturePad() {
    const canvas = $("consentSignature");
    let drawing = false;

    const point = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    canvas.addEventListener("pointerdown", event => {
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      const p = point(event);
      const context = canvas.getContext("2d");
      context.beginPath();
      context.moveTo(p.x, p.y);
      event.preventDefault();
    });
    canvas.addEventListener("pointermove", event => {
      if (!drawing) return;
      const p = point(event);
      const context = canvas.getContext("2d");
      context.lineTo(p.x, p.y);
      context.stroke();
      signatureDrawn = true;
      canvas.parentElement.classList.add("has-signature");
      event.preventDefault();
    });
    const stop = () => { drawing = false; };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    $("clearConsentSignature").addEventListener("click", clearSignature);
  }

  function clearSignature() {
    const canvas = $("consentSignature");
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    signatureDrawn = false;
    canvas.parentElement.classList.remove("has-signature");
  }

  function signatureBlob() {
    return new Promise((resolve, reject) => {
      $("consentSignature").toBlob(blob => blob ? resolve(blob) : reject(new Error("서명 이미지를 만들 수 없습니다.")), "image/png");
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("서명 이미지를 읽을 수 없습니다."));
      reader.readAsDataURL(blob);
    });
  }

  async function waitForPrintImages() {
    const images = [...$("consentPrintArea").querySelectorAll("img")];
    await Promise.all(images.map(image => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", () => reject(new Error("서명 이미지 표시에 실패했습니다.")), { once: true });
      });
    }));
  }

  function buildPrintArea(record, signatureUrl) {
    const checked = (value, label) => `
      <span class="consent-print-option"><i class="${value ? "selected" : ""}"></i>${label}</span>`;
    const agreement = value => `${checked(value, "동의함")}${checked(!value, "동의하지 않음")}`;
    const channels = record.marketing_channels || [];
    const submitted = record.submitted_at ? new Date(record.submitted_at) : new Date();
    const dateParts = {
      year: String(submitted.getFullYear()).slice(-2),
      month: submitted.getMonth() + 1,
      day: submitted.getDate()
    };
    $("consentPrintArea").innerHTML = `
      <div class="consent-print-brand">tymict</div>
      <h1 class="consent-print-title">개인정보 수집·이용 및 제 3 자 제공 동의서</h1>
      <p class="consent-print-subtitle">제품 AS·전시회 정보·제품정보 및 뉴스레터 제공</p>
      <p class="consent-print-intro">주식회사 tymict는 제품 AS 정보, 전시회 정보, 제품정보 및 뉴스레터 제공을 위해 「개인정보 보호법」 등 관련 법규에 의거하여 아래와 같이 개인정보 수집·이용 및 제 3 자 제공에 대한 동의를 받고 있습니다. 내용을 자세히 읽으신 후 동의 여부를 결정하여 주십시오.</p>

      <section class="consent-print-section">
        <h2>1&nbsp; [필수] 개인정보 수집·이용·제공에 대한 동의</h2>
        <table><thead><tr><th>수집·이용 목적</th><th>수집 항목</th><th>보유·이용 기간</th></tr></thead><tbody>
          <tr><td>전시회 정보 안내<br>제품정보 및 뉴스레터 제공</td><td>성명, 전화번호, 주소,<br>보유제품명</td><td>정보수집 후 5년</td></tr>
          <tr class="consent-print-notice"><td colspan="3"><b>동의 거부 안내&nbsp; |&nbsp;</b> 위 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만, 동의를 거부할 경우 전시회 정보 안내, 제품정보 및 뉴스레터 제공에 제한이 있을 수 있습니다.</td></tr>
        </tbody></table>
        <p class="consent-print-question">위와 같이 개인정보를 수집·이용하는 것에 동의하십니까? <small>(만 14세 미만 아동은 법정대리인 동의 필요)</small><span>${agreement(record.required_collection_agreed)}</span></p>
      </section>

      <section class="consent-print-section">
        <h2>2&nbsp; [선택] 개인정보 수집·이용·제공에 대한 동의</h2>
        <table><thead><tr><th>수집·이용 목적</th><th>수집 항목</th><th>보유·이용 기간</th></tr></thead><tbody>
          <tr><td>신규서비스 및 이벤트 정보 안내(DM, SMS, 우편)<br>경품 배송 및 행사 안내 / 고객별 통계분석자료 활용<br>시장조사 / 품질·서비스 만족도조사</td><td>성명, 전화번호, 주소,<br>보유제품명</td><td>정보수집 후 5년</td></tr>
          <tr class="consent-print-notice"><td colspan="3"><b>동의 거부 안내&nbsp; |&nbsp;</b> 위 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만, 동의를 거부한 경우 이벤트 정보 및 행사 안내 등의 서비스를 제공받지 못할 수 있습니다.</td></tr>
        </tbody></table>
        <p class="consent-print-question">위와 같이 개인정보를 수집·이용하는 것에 동의하십니까?<span>${agreement(record.optional_collection_agreed)}</span></p>
        <p class="consent-print-channels">서비스 안내 수단:&nbsp; ${checked(channels.includes("전화"), "전화")} ${checked(channels.includes("문자(SMS/LMS/MMS)"), "문자(SMS/LMS/MMS)")}</p>
      </section>

      <section class="consent-print-section">
        <h2>3&nbsp; [선택] 개인정보 제 3 자 제공 내역</h2>
        <p class="consent-print-lead">개인정보처리자는 아래와 같이 개인정보를 제 3 자에게 제공합니다.</p>
        <table class="consent-print-third"><thead><tr><th>제공받는 자</th><th>제공 항목</th><th>제공받는 자의 이용 목적</th><th>보유·이용 기간</th></tr></thead><tbody>
          <tr><td>tymict</td><td>성명, 전화번호, 주소,<br>보유제품명</td><td>제품 판매대행 및 사후 고객 관리<br>차량배송·보증수리·긴급출동·차량관리<br>서비스 프로그램<br>제품정보·프로모션 정보 우편 발송</td><td>정보수집 후 5년</td></tr>
          <tr class="consent-print-notice"><td colspan="4"><b>동의 거부 안내&nbsp; |&nbsp;</b> 위 개인정보 제공에 대한 동의를 거부할 권리가 있습니다. 다만, 동의를 거부할 경우 원활한 서비스 제공에 일부 제한을 받을 수 있습니다.</td></tr>
        </tbody></table>
        <p class="consent-print-question">위와 같이 개인정보를 제 3 자에게 제공하는 데 동의하십니까?<span>${agreement(record.third_party_agreed)}</span></p>
        <table class="consent-print-person"><thead><tr><th>성명</th><th>전화번호</th><th>주소</th><th>보유 브랜드</th><th>보유 제품명</th><th>보유 대수</th></tr></thead><tbody><tr>
          <td>${escapeHtml(record.customer_name)}</td><td>${escapeHtml(record.phone)}</td><td>${escapeHtml(record.address)}</td><td>${escapeHtml(record.owned_brand || "-")}</td><td>${escapeHtml(record.owned_product || "-")}</td><td>${Number(record.owned_count || 0)}</td>
        </tr></tbody></table>
      </section>

      <section class="consent-print-section consent-print-last">
        <h2>4&nbsp; [선택] 광고성 정보 수신 동의</h2>
        <p>본인은 귀사가 제공하는 고객 혜택 정보 및 광고 수신 서비스를 제공받고자 하며, 선택한 안내 수단으로 전송하는 것에 동의합니다. ${checked(channels.includes("전화"), "전화")} ${checked(channels.includes("문자(SMS/LMS/MMS)"), "문자(SMS/LMS/MMS)")}</p>
        <p class="consent-print-question">위 광고성 정보 수신에 동의하십니까?<span>${agreement(record.marketing_agreed)}</span></p>
      </section>
      <div class="consent-print-signature"><span>20${dateParts.year}&nbsp;&nbsp; 년&nbsp;&nbsp; ${dateParts.month}&nbsp;&nbsp; 월&nbsp;&nbsp; ${dateParts.day}&nbsp;&nbsp; 일</span><strong>동의자 성명&nbsp; ${escapeHtml(record.customer_name)}</strong><span class="consent-print-signature-box">(서명 또는 인)${signatureUrl ? `<img src="${escapeHtml(signatureUrl)}" alt="서명">` : ""}</span></div>
      <p class="consent-print-recipient">tymict 귀중</p>`;
  }

  async function submitConsent(event) {
    event.preventDefault();
    if (![0, 1, 4].every(validateStep)) return;
    if (!signatureDrawn) {
      alert("서명란에 서명해 주세요.");
      return;
    }

    const button = $("submitConsent");
    button.disabled = true;
    button.textContent = "안전하게 저장하는 중...";

    try {
      const record = collectConsentData();
      const id = crypto.randomUUID();
      const signature = await signatureBlob();
      const signaturePath = `${id}/signature.png`;
      const { error: uploadError } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(signaturePath, signature, { contentType: "image/png", upsert: false });
      if (uploadError) {
        throw new Error(`서명 저장 실패: ${uploadError.message}`);
      }

      const submittedAt = new Date().toISOString();
      const { error: insertError } = await supabaseClient.from("consent_forms").insert({
        id,
        ...record,
        signature_path: signaturePath,
        submitted_at: submittedAt
      });
      if (insertError) {
        const { error: cleanupError } = await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .remove([signaturePath]);
        if (cleanupError) console.error("CONSENT SIGNATURE CLEANUP ERROR:", cleanupError);

        if (insertError.message?.includes("consent_forms_phone_check")) {
          throw new Error("동의 내용 저장 실패: 연락처를 숫자와 하이픈을 포함해 7자 이상 입력해 주세요.");
        }
        throw new Error(`동의 내용 저장 실패: ${insertError.message}`);
      }

      lastSubmittedConsent = { id, ...record, signature_path: signaturePath, submitted_at: submittedAt };
      buildPrintArea(lastSubmittedConsent, $("consentSignature").toDataURL("image/png"));
      $("consentForm").classList.add("hidden");
      $("consentProgressBar").parentElement.classList.add("hidden");
      $("consentComplete").classList.remove("hidden");
      $("consentCompleteText").textContent = `${record.customer_name}님의 동의서가 ${formatDate(submittedAt)}에 안전하게 저장되었습니다.`;
      await loadConsentAdminPanel();
    } catch (error) {
      console.error("CONSENT SUBMIT ERROR:", error);
      alert(`동의서 저장에 실패했습니다.\n${error.message || "잠시 후 다시 시도해 주세요."}`);
    } finally {
      button.disabled = false;
      button.textContent = "서명 동의서 제출";
    }
  }

  function resetConsent() {
    $("consentForm").reset();
    $("consentCount").value = "1";
    currentStep = 0;
    clearSignature();
    $("consentForm").classList.remove("hidden");
    $("consentProgressBar").parentElement.classList.remove("hidden");
    $("consentComplete").classList.add("hidden");
    lastSubmittedConsent = null;
    updateStep();
  }

  async function isActiveAdmin() {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const user = sessionData.session?.user;
    if (!user?.email) return false;
    const { data } = await supabaseClient.from("master_admins")
      .select("id").eq("email", user.email).eq("active", true).maybeSingle();
    return Boolean(data);
  }

  function renderConsentList() {
    const query = $("consentSearch").value.trim().toLowerCase();
    const records = consentRecords.filter(record =>
      `${record.customer_name} ${record.phone}`.toLowerCase().includes(query));
    const totalPages = Math.max(1, Math.ceil(records.length / consentPageSize));
    consentPage = Math.min(Math.max(1, consentPage), totalPages);
    const start = (consentPage - 1) * consentPageSize;
    const pageRecords = records.slice(start, start + consentPageSize);
    $("consentListCount").textContent = `총 ${records.length}건`;
    $("consentPageInfo").textContent = `${consentPage} / ${totalPages}`;
    $("consentPagePrev").disabled = consentPage <= 1;
    $("consentPageNext").disabled = consentPage >= totalPages;
    if (!records.length) {
      $("consentList").innerHTML = '<div class="consent-list-empty">조회할 동의서가 없습니다.</div>';
      return;
    }
    $("consentList").innerHTML = pageRecords.map(record => `
      <article class="consent-list-item">
        <div><strong>${escapeHtml(record.customer_name)}</strong><small>${escapeHtml(record.phone)}</small></div>
        <div><span>${escapeHtml(record.owned_product || "제품 미입력")}</span><small>${escapeHtml(record.owned_brand || "브랜드 미입력")}</small></div>
        <div><span>${formatDate(record.submitted_at)}</span><small>필수 동의 완료</small></div>
        <div class="consent-list-actions"><button type="button" class="secondary" data-consent-view="${record.id}">보기·PDF</button><button type="button" class="danger consent-delete" data-consent-delete="${record.id}">삭제</button></div>
      </article>`).join("");
  }

  async function loadConsentAdminPanel() {
    if (!await isActiveAdmin()) {
      $("consentAdminPanel").classList.add("hidden");
      return;
    }
    $("consentAdminPanel").classList.remove("hidden");
    const { data, error } = await supabaseClient.from("consent_forms")
      .select("*").order("submitted_at", { ascending: false }).limit(1000);
    if (error) {
      console.error("CONSENT LIST ERROR:", error);
      $("consentList").innerHTML = '<div class="consent-list-empty">동의서 목록을 불러오지 못했습니다.</div>';
      return;
    }
    consentRecords = data || [];
    renderConsentList();
  }

  async function deleteAdminConsent(id, button) {
    const record = consentRecords.find(item => item.id === id);
    if (!record) return;
    if (!confirm(`${record.customer_name}님의 동의서를 삭제할까요?\n삭제한 동의서와 서명은 복구할 수 없습니다.`)) return;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "삭제 중...";
    try {
      const { data: deletedRows, error: deleteError } = await supabaseClient
        .from("consent_forms").delete().eq("id", id).select("id");
      if (deleteError) throw new Error(`동의서 삭제 실패: ${deleteError.message}`);
      if (!deletedRows?.length) throw new Error("관리자 삭제 권한을 확인해 주세요.");

      if (record.signature_path) {
        const { error: signatureError } = await supabaseClient.storage
          .from(STORAGE_BUCKET).remove([record.signature_path]);
        if (signatureError) {
          console.error("CONSENT SIGNATURE DELETE ERROR:", signatureError);
          alert("동의서는 삭제되었지만 서명 파일 정리에 실패했습니다. 관리자에게 확인해 주세요.");
        }
      }

      consentRecords = consentRecords.filter(item => item.id !== id);
      renderConsentList();
    } catch (error) {
      console.error("CONSENT DELETE ERROR:", error);
      alert(`동의서를 삭제하지 못했습니다.\n${error.message || "잠시 후 다시 시도해 주세요."}`);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function printAdminConsent(id, button) {
    const record = consentRecords.find(item => item.id === id);
    if (!record) return;
    const originalText = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = "서명 불러오는 중...";
    }
    try {
      if (!record.signature_path) throw new Error("저장된 서명 경로가 없습니다.");
      const { data: signatureBlobData, error } = await supabaseClient.storage
        .from(STORAGE_BUCKET).download(record.signature_path);
      if (error || !signatureBlobData) {
        throw new Error(error?.message || "서명 파일을 다운로드할 수 없습니다.");
      }
      const signatureDataUrl = await blobToDataUrl(signatureBlobData);
      buildPrintArea(record, signatureDataUrl);
      await waitForPrintImages();
      window.print();
    } catch (error) {
      console.error("CONSENT SIGNATURE PRINT ERROR:", error);
      alert(`서명을 불러오지 못했습니다.\n${error.message || "잠시 후 다시 시도해 주세요."}`);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!$("consentForm")) return;
    document.body.appendChild($("consentPrintArea"));
    setupSignaturePad();
    $("consentForm").addEventListener("submit", submitConsent);
    $("consentPrev").addEventListener("click", () => { currentStep = Math.max(0, currentStep - 1); updateStep(); });
    $("consentNext").addEventListener("click", () => { if (validateStep(currentStep)) { currentStep = Math.min(4, currentStep + 1); updateStep(); } });
    $("resetConsentForm").addEventListener("click", resetConsent);
    $("createAnotherConsent").addEventListener("click", resetConsent);
    $("printConsent").addEventListener("click", () => { if (lastSubmittedConsent) window.print(); });
    $("refreshConsentList").addEventListener("click", loadConsentAdminPanel);
    $("consentSearch").addEventListener("input", () => { consentPage = 1; renderConsentList(); });
    $("consentPageSize").addEventListener("change", event => {
      consentPageSize = Number(event.target.value) || 10;
      consentPage = 1;
      renderConsentList();
    });
    $("consentPagePrev").addEventListener("click", () => { consentPage = Math.max(1, consentPage - 1); renderConsentList(); });
    $("consentPageNext").addEventListener("click", () => { consentPage += 1; renderConsentList(); });
    $("consentList").addEventListener("click", event => {
      const viewButton = event.target.closest("[data-consent-view]");
      if (viewButton) printAdminConsent(viewButton.dataset.consentView, viewButton);
      const deleteButton = event.target.closest("[data-consent-delete]");
      if (deleteButton) deleteAdminConsent(deleteButton.dataset.consentDelete, deleteButton);
    });
    document.querySelector('[data-tab="consent"]').addEventListener("click", () => {
      setTimeout(() => { resizeSignatureCanvas(); loadConsentAdminPanel(); }, 80);
    });
    window.addEventListener("resize", () => {
      clearTimeout(window.consentResizeTimer);
      window.consentResizeTimer = setTimeout(resizeSignatureCanvas, 150);
    });
    updateStep();
  });
})();
