const app = document.getElementById("app");

function render() {
  const hash = window.location.hash;

  if (hash === "#/admin") {
    renderAdmin();
  } else {
    renderCustomer();
  }
}

// 고객 화면
function renderCustomer() {
  app.innerHTML = `
    <div class="container">
      <h1>고객 로그인</h1>
      <input id="team" placeholder="팀명" />
      <input id="phone" placeholder="전화번호" />
      <button onclick="register()">등록</button>
    </div>
  `;
}

// 관리자 화면
function renderAdmin() {
  app.innerHTML = `
    <div class="container">
      <h1>관리자 화면</h1>
      <div id="list"></div>
    </div>
  `;

  loadList();
}

// Firebase 등록
function register() {
  const team = document.getElementById("team").value;
  const phone = document.getElementById("phone").value;

  db.collection("ghostpang_waiting").add({
    teamName: team,
    phone: phone,
    createdAt: new Date()
  });

  alert("등록 완료");
}

// 리스트 불러오기
function loadList() {
  const list = document.getElementById("list");

  db.collection("ghostpang_waiting")
    .orderBy("createdAt", "asc")
    .onSnapshot((snapshot) => {
      list.innerHTML = "";

      snapshot.forEach((doc) => {
        const data = doc.data();
        list.innerHTML += `
          <div>
            ${data.teamName} / ${data.phone}
          </div>
        `;
      });
    });
}

// 최초 실행
window.addEventListener("hashchange", render);
render();
