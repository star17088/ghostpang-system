const SUPABASE_URL = "https://meklvygwptbzewqvhtob.supabase.co";
const SUPABASE_KEY = "여기에_publishable_key";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = document.getElementById("app");

// 페이지 구분
function getRoute() {
  return location.hash.includes("admin") ? "admin" : "customer";
}

// 실행
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

      <button onclick="login()">등록</button>

      <h3>실시간 대기</h3>
      <div id="list"></div>
    </div>
  `;

  loadList();
}

// 등록
async function login() {
  const team = document.getElementById("team").value;
  const phone = document.getElementById("phone").value;

  if (!team) return alert("팀명 입력하세요");

  await supabase.from("waiting_list").insert([
    {
      team_name: team,
      phone: phone
    }
  ]);

  loadList();
}

// 리스트
async function loadList() {
  const { data } = await supabase
    .from("waiting_list")
    .select("*")
    .order("created_at", { ascending: true });

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

// 관리자 리스트
async function loadAdmin() {
  const { data } = await supabase
    .from("waiting_list")
    .select("*")
    .order("created_at", { ascending: true });

  document.getElementById("adminList").innerHTML =
    data.map(d => `<div>${d.team_name} / ${d.phone}</div>`).join("");
}

// =========================
// 라우팅
// =========================
function render() {
  if (getRoute() === "admin") {
    renderAdmin();
  } else {
    renderCustomer();
  }
}
