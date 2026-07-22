(function () {
  let wheels = [];

  function setStatus(message, tone = "info") {
    const status = document.getElementById("wheelsStatus");
    status.textContent = message;
    status.classList.toggle("is-error", tone === "error");
  }

  function parseParticipants(value) {
    const seen = new Set();
    return String(value || "")
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLocaleLowerCase("vi");
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function resetForm() {
    document.getElementById("wheelId").value = "";
    document.getElementById("wheelTitle").value = "";
    document.getElementById("wheelParticipants").value = "";
    document.getElementById("wheelActive").checked = true;
    document.getElementById("wheelFormTitle").textContent = "Tạo vòng quay mới";
  }

  function fillForm(wheel) {
    document.getElementById("wheelId").value = wheel.wheelId || "";
    document.getElementById("wheelTitle").value = wheel.title || "";
    document.getElementById("wheelParticipants").value = Array.isArray(wheel.participants) ? wheel.participants.join("\n") : "";
    document.getElementById("wheelActive").checked = wheel.active !== false;
    document.getElementById("wheelFormTitle").textContent = "Sửa vòng quay";
  }

  function renderWheels() {
    const list = document.getElementById("wheelList");

    if (wheels.length === 0) {
      list.innerHTML = `<div class="panel"><h2>Chưa có vòng quay</h2><p class="lead">Hãy tạo vòng quay đầu tiên.</p></div>`;
      return;
    }

    list.innerHTML = wheels.map((wheel, index) => `
      <article class="wheel-item">
        <div>
          <h3>${escapeHtml(wheel.title || "Vòng quay chưa đặt tên")}</h3>
          <p class="muted">${Array.isArray(wheel.participants) ? wheel.participants.length : 0} người tham gia</p>
        </div>
        <div class="button-row">
          <button class="button secondary" type="button" data-edit-wheel="${index}">Sửa</button>
          <button class="button secondary" type="button" data-delete-wheel="${wheel.wheelId || ""}">Xóa</button>
        </div>
      </article>
    `).join("");

    list.querySelectorAll("[data-edit-wheel]").forEach((button) => {
      button.addEventListener("click", () => fillForm(wheels[Number(button.dataset.editWheel)]));
    });

    list.querySelectorAll("[data-delete-wheel]").forEach((button) => {
      button.addEventListener("click", async () => {
        const wheelId = button.dataset.deleteWheel;
        if (!wheelId) {
          setStatus("Wheel chưa có wheelId để xóa.", "error");
          return;
        }

        try {
          await window.SionApi.adminDeleteWheel(window.SionAuth.getToken(), wheelId);
          setStatus("Đã xóa vòng quay.");
          await loadWheels();
        } catch (error) {
          setStatus("Không xóa được vòng quay.", "error");
        }
      });
    });
  }

  async function loadWheels() {
    try {
      setStatus("Đang tải danh sách vòng quay...");
      const data = await window.SionApi.getWheels();
      wheels = Array.isArray(data.wheels) ? data.wheels : [];
      renderWheels();
      setStatus("Đã tải danh sách vòng quay.");
    } catch (error) {
      setStatus("Không tải được danh sách vòng quay.", "error");
    }
  }

  async function submitWheel(event) {
    event.preventDefault();
    const wheelId = document.getElementById("wheelId").value.trim();
    const title = document.getElementById("wheelTitle").value.trim();
    const participants = parseParticipants(document.getElementById("wheelParticipants").value);
    const active = document.getElementById("wheelActive").checked;

    if (participants.length < 2) {
      setStatus("Vòng quay cần ít nhất 2 người tham gia.", "error");
      return;
    }

    const wheelData = {
      wheelId,
      title,
      participants,
      active
    };

    try {
      if (wheelId) {
        await window.SionApi.adminUpdateWheel(window.SionAuth.getToken(), wheelData);
        setStatus("Đã cập nhật vòng quay.");
      } else {
        await window.SionApi.adminCreateWheel(window.SionAuth.getToken(), wheelData);
        setStatus("Đã tạo vòng quay.");
      }

      resetForm();
      await loadWheels();
    } catch (error) {
      setStatus("Không lưu được vòng quay.", "error");
    }
  }

  async function initWheels() {
    const user = await window.SionRouteGuard.requireAdmin();
    if (!user) {
      return;
    }

    document.getElementById("wheelForm").addEventListener("submit", submitWheel);
    document.getElementById("newWheelButton").addEventListener("click", resetForm);
    await loadWheels();
  }

  document.addEventListener("DOMContentLoaded", initWheels);
})();
