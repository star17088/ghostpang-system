const SUPABASE_URL = "https://meklvygwptbzewqvhtob.supabase.co";
const SUPABASE_KEY = "sb_publishable_uqBa2htSwYsnysLIUVxTQw_8xlIC5Cg";

const app = document.getElementById("app");

function renderError(message) {
  app.innerHTML = `
    <div style="padding:20px;background:black;color:white;min-height:100vh;">
      <h2>고스트팡 시스템</h2>
      <div style="margin-top:16px;padding:16px;background:#1a1a1a;border-radius:10px;">
        ${message}
      </div>
    </div>
  `;
}

function getRoute() {
  return location.hash.includes("admin") ? "admin" : "customer";
}

if (!window.supabase) {
  renderError("supabase 라이브러리를 불러오지 못했습니다.");
} else if (
  !SUPABASE_URL ||
  SUPABASE_URL.includes("여기에") ||
  !SUPABASE_KEY ||
  SUPABASE_KEY.includes("여기에")
) {
  renderError("SUPABASE_URL 또는 SUPABASE_KEY를 실제 값으로 바꿔주세요.");
} else {
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  render();

  function render() {
    if (getRoute() === "admin") {
      renderAdmin();
    } else {
      renderCustomer();
    }
  }

  function renderCustomer() {
    app.innerHTML = `
      <div style="padding:20px;background:black;color:white;min-height:100vh">
        <h2>고스트팡 고객 화면</h2>

        <input id="team" placeholder="팀명" style="padding:10px;width:240px;"><br><br>
        <input id="phone" placeholder="전화번호" style="padding:10px;width:240px;"><br><br>

        <button id="loginBtn" style="padding:10px 16px;background:orange;color:white;border:none;border-radius:8px;cursor:pointer;">등록</button>

        <h3 style="margin-top:30px;">실시간 대기</h3>
        <div id="list">불러오는 중...</div>
      </div>
    `;

    document.getElementById("loginBtn").addEventListener("click", login);
    loadList();
  }

  async function login() {
    const team = document.getElementById("team").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!team) {
      alert("팀명을 입력하세요");
      return;
    }

    const { error } = await supabase.from("waiting_list").insert([
      {
        team_name: team,
        phone: phone,
        waiting_number: Date.now()
      }
    ]);

    if (error) {
      alert("등록 실패: " + error.message);
      return;
    }

    document.getElementById("team").value = "";
    document.getElementById("phone").value = "";
    loadList();
  }

  async function loadList() {
    const list = document.getElementById("list");
    if (!list) return;

    const { data, error } = await supabase
      .from("waiting_list")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      list.innerHTML = `<div style="color:#ff8080;">불러오기 실패: ${error.message}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      list.innerHTML = `<div>현재 대기 없음</div>`;
      return;
    }

    list.innerHTML = data
      .map(
        (d, i) => `
          <div style="padding:10px;margin-bottom:8px;background:#1a1a1a;border-radius:8px;">
            ${i + 1}. ${d.team_name || "-"}${d.phone ? " / " + d.phone : ""}
          </div>
        `
      )
      .join("");
  }

  function renderAdmin() {
    app.innerHTML = `
      <div style="padding:20px;min-height:100vh;background:#f4f4f4;color:#111;">
        <h2>관리자 화면</h2>
        <button id="loadAdminBtn" style="padding:10px 16px;background:#111;color:white;border:none;border-radius:8px;cursor:pointer;">불러오기</button>
        <div id="adminList" style="margin-top:20px;">불러오는 중...</div>
      </div>
    `;

    document.getElementById("loadAdminBtn").addEventListener("click", loadAdmin);
    loadAdmin();
  }

  async function loadAdmin() {
    const adminList = document.getElementById("adminList");
    if (!adminList) return;

    const { data, error } = await supabase
      .from("waiting_list")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      adminList.innerHTML = `<div style="color:red;">불러오기 실패: ${error.message}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      adminList.innerHTML = `<div>현재 대기 없음</div>`;
      return;
    }

    adminList.innerHTML = data
      .map(
        (d, i) => `
          <div style="padding:10px;margin-bottom:8px;background:white;border-radius:8px;border:1px solid #ddd;">
            ${i + 1}. ${d.team_name || "-"} / ${d.phone || "-"}
          </div>
        `
      )
      .join("");
  }
}
