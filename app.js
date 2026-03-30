const SUPABASE_URL = "여기에_URL";
const SUPABASE_KEY = "여기에_publishable_key";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById("app");

// 현재 페이지 구분
function getRoute() {
  return location.hash.includes("admin") ? "admin" : "customer";
}

// 초기 실행
render();

// =========================
// 고객 화면
// =========================
function renderCustomer() {
  app.innerHTML = `
    <div style="padding:20px;background:black;color:white;min-height:100vh">
      <h2>고스트팡 고객 화면</h2>

      <input id="team" placeholder="팀명"><br><br>
      <input id="phone" placeholder="전화번호"><br><br>

      <button onclick="login()">로그인</button>

      <h3>실시간 대기</h3>
      <div id="list"></div>
    </div>
  `;
}

// 로그인 + 등록
async function login() {
  const team = document.getElementById("team").value;
  const phone = document.getElementById("phone").value;

  await supabase.from("customers").insert([
    {
      team_name: team,
      phone: phone
    }
  ]);

  loadList();
}

// 대기 리스트 불러오기
async function loadList() {
  const { data } = await supabase.from("customers").select("*");

  document.getElementById("list").innerHTML =
    data.map(d => `<div>${d.team_name}</div>`).join("");
}

// =========================
// 관리자 화면
// =========================
function renderAdmin() {
  app.innerHTML = `
    <div style="padding:20px">
      <h2>관리자 화면</h2>
      <button onclick="loadAdmin()">불러오기</button>
      <div id="adminList"></div>
    </div>
  `;
}

async function loadAdmin() {
  const { data } = await supabase.from("customers").select("*");

  document.getElementById("adminList").innerHTML =
    data.map(d => `<div>${d.team_name} / ${d.phone}</div>`).join("");
}

// =========================
// 라우팅 실행
// =========================
function render() {
  if (getRoute() === "admin") {
    renderAdmin();
  } else {
    renderCustomer();
  }
}
