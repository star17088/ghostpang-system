import { DATA_DOC, getDoc, setDoc, onSnapshot } from "./firebase.js";
const ADMIN_PASSWORD = "0702";

const ROOM_OPTIONS = [
  { key: "big", label: "큰방", size: "3~6인" },
  { key: "small1", label: "작은방1", size: "2~4인" },
  { key: "small2", label: "작은방2", size: "2~4인" },
];

const initialData = {
  users: [],
  queues: {
    big: [
      { userId: "A", startAt: 123 }
    ],
    small1: [],
    small2: [],
    boardgame: [],
  },
  queueTimers: {
    big: null,
    small1: null,
    small2: null,
  },
};

let state = {
  screen: "customer", // customer | pc | admin
  pcTab: "rooms", // rooms | boardgame
  currentUserId: null,
  adminLoggedIn: false,
  adminPasswordInput: "",
  searchKeyword: "",
  showAllUsers: false,
  customerForm: {
    teamName: "",
    phone: "",
    people: "",
    tableNo: "",
  },
  data: JSON.parse(JSON.stringify(initialData)),
};

onSnapshot(DATA_DOC, (snap) => {
  if (snap.exists()) {
    state.data = snap.data();
    render();
  }
});

async function saveData() {
  try {
    await setDoc(DATA_DOC, state.data);
  } catch (e) {
    alert("저장 오류 발생");
    console.error(e);
  }
}

async function loadData() {
  const snap = await getDoc(DATA_DOC);

  if (snap.exists()) {
    state.data = snap.data();

    if (!state.data.queueTimers) {
      state.data.queueTimers = { big: null, small1: null, small2: null };
    }
  } else {
    await setDoc(DATA_DOC, state.data);
  }

  render();
}

function onlyNumber(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowText() {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

function maskPhone(phone) {
  const p = onlyNumber(phone);
  if (p.length < 7) return p;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  if (p.length >= 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7, 11)}`;
  return p;
}

function getNowMinute() {
  return Math.floor(Date.now() / 60000);
}

function getRemainingMinutes(queueKey, index) {
  if (!["big", "small1", "small2"].includes(queueKey)) return null;

  const startedAt = state.data.queueTimers?.[queueKey];
  if (!startedAt) return (index + 1) * 16;

  const passed = Math.max(0, getNowMinute() - startedAt);
  const total = (index + 1) * 16;
  return Math.max(0, total - passed);
}

function getCurrentUser() {
  return state.data.users.find((u) => u.id === state.currentUserId) || null;
}

function getUserById(id) {
  return state.data.users.find((u) => u.id === id) || null;
}

function getQueueUsers(queueKey) {
  return state.data.queues[queueKey]
    .map((q) => getUserById(q.userId))
    .filter(Boolean);
}

function getBoardgameUsers() {
  return getQueueUsers("boardgame");
}

function getFilteredUsers() {
  const keyword = state.searchKeyword.trim();

  if (!keyword && !state.showAllUsers) return [];

  if (!keyword && state.showAllUsers) {
    return state.data.users;
  }

  const numberKeyword = onlyNumber(keyword);
  return state.data.users.filter((u) => {
    return (
      String(u.teamName || "").includes(keyword) ||
      onlyNumber(u.phone).includes(numberKeyword)
    );
  });
}

function setScreen(screen) {
  location.hash = "/" + screen;
}

function syncScreenWithHash() {
  const hash = location.hash.replace("#/", "");
  if (["customer", "pc", "admin", "guide"].includes(hash)) {
    state.screen = hash;
  } else {
    state.screen = "customer";
  }
}

window.addEventListener("hashchange", () => {
  syncScreenWithHash();
  render();
});

function setPcTab(tab) {
  state.pcTab = tab;
  render();
}

function updateCustomerForm(key, value) {
  state.customerForm[key] = value;
}

function updateAdminPassword(value) {
  state.adminPasswordInput = value;
}

function updateSearchKeyword(value) {
  state.searchKeyword = value;
  if (String(value).trim()) {
    state.showAllUsers = false;
  }
  render();
}

function showAllUsersList() {
  state.searchKeyword = "";
  state.showAllUsers = true;
  render();
}

function handleCustomerLogin() {
  const teamName = state.customerForm.teamName.trim();
  const phone = onlyNumber(state.customerForm.phone);

  if (!teamName || !phone) {
    alert("팀이름과 전화번호를 입력해주세요.");
    return;
  }

  let user = state.data.users.find(
  (u) =>
    onlyNumber(u.phone) === phone &&
    String(u.teamName || "").trim() === teamName
  );

  if (!user) {
  user = {
    id: makeId(),
    teamName,
    phone,
    people: "",
    tableNo: "",
    points: 0,
    boardgamePoint: 0,
    boardgameJoinedAt: "",
    createdAt: nowText(),
  };
  state.data.users.push(user);
}
  

  state.currentUserId = user.id;
  state.customerForm.people = user.people || "";
  state.customerForm.tableNo = user.tableNo || "";

  saveData();
  render();
}

function handleCustomerSaveStep2() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("먼저 로그인해주세요.");
    return;
  }

  const people = String(state.customerForm.people || "").trim();
  const tableNo = String(state.customerForm.tableNo || "").trim();

  if (!people || !tableNo) {
    alert("인원수와 테이블 번호를 입력해주세요.");
    return;
  }

  currentUser.people = people;
  currentUser.tableNo = tableNo;
  saveData();
  alert("저장되었습니다.");
  render();
}

function logoutCustomer() {
  state.currentUserId = null;
  state.customerForm = {
    teamName: "",
    phone: "",
    people: "",
    tableNo: "",
  };
  render();
}

function isAlreadyInQueue(queueKey, userId) {
  return state.data.queues[queueKey].some(q => q.userId === userId);
}

function handleReserve(queueKey) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("먼저 로그인해주세요.");
    return;
  }

  if (!currentUser.people || !currentUser.tableNo) {
    alert("인원수와 테이블 번호를 먼저 저장해주세요.");
    return;
  }

  if ((currentUser.points || 0) < 1) {
    alert("예약 가능한 포인트가 없습니다.");
    return;
  }

  if (isAlreadyInQueue(queueKey, currentUser.id)) {
    alert("이미 해당 대기열에 등록되어 있습니다.");
    return;
  }

  currentUser.points = (currentUser.points || 0) - 1;

  const queue = state.data.queues[queueKey];

  let startAt;

  if (queue.length === 0) {
    startAt = getNowMinute();
  } else {
    const last = queue[queue.length - 1];
    startAt = last.startAt + 16;
  }

  queue.push({
    userId: currentUser.id,
    startAt
  });

  saveData();
  render();
}

function handleAdminLogin() {
  if (state.adminPasswordInput === ADMIN_PASSWORD) {
    state.adminLoggedIn = true;
    state.screen = "admin";
    render();
  } else {
    alert("관리자 비밀번호가 올바르지 않습니다.");
  }
}

function givePoints(userId, amount) {
  const user = getUserById(userId);
  if (!user) return;
  user.points = (user.points || 0) + amount;
  saveData();
  render();
}

function subtractPoints(userId, amount) {
  const user = getUserById(userId);
  if (!user) return;

  user.points = Math.max(0, (user.points || 0) - amount);
  saveData();
  render();
}

function deleteUser(userId) {
  const user = getUserById(userId);
  if (!user) return;

  const ok = window.confirm(`${user.teamName || "이 고객"} 정보를 삭제할까요?`);
  if (!ok) return;

  state.data.users = state.data.users.filter((u) => u.id !== userId);

  state.data.queues.big = state.data.queues.big.filter((id) => id !== userId);
  state.data.queues.small1 = state.data.queues.small1.filter((id) => id !== userId);
  state.data.queues.small2 = state.data.queues.small2.filter((id) => id !== userId);
  state.data.queues.boardgame = state.data.queues.boardgame.filter((id) => id !== userId);

  if (state.currentUserId === userId) {
    state.currentUserId = null;
    state.customerForm = {
      teamName: "",
      phone: "",
      people: "",
      tableNo: "",
    };
  }

  saveData();
  render();
}

function giveBoardgamePoint(userId) {
  const user = getUserById(userId);
  if (!user) return;

  user.boardgamePoint = 1;
  user.boardgameJoinedAt = user.boardgameJoinedAt || nowText();

  if (!state.data.queues.boardgame.includes(userId)) {
    state.data.queues.boardgame.push(userId);
  }

  saveData();
  render();
}

function removeFromQueue(queueKey, userId) {
  if (!state.data.queueTimers) {
    state.data.queueTimers = { big: null, small1: null, small2: null };
  }


  if (queueKey === "boardgame") {
    const user = getUserById(userId);
    if (user) {
      user.boardgamePoint = 0;
      user.boardgameJoinedAt = "";
    }
  }

  if (["big", "small1", "small2"].includes(queueKey)) {
    if (state.data.queues[queueKey].length > 0) {
      state.data.queueTimers[queueKey] = getNowMinute();
    } else {
      state.data.queueTimers[queueKey] = null;
    }
  }

  saveData();
  render();
}

function resetAll() {
  const ok = window.confirm(
    "전체 데이터를 초기화할까요?\n등록 고객, 포인트, 대기열이 모두 삭제됩니다."
  );
  if (!ok) return;

  state.data = JSON.parse(JSON.stringify(initialData));
  state.currentUserId = null;
  state.adminPasswordInput = "";
  state.searchKeyword = "";
  state.customerForm = {
    teamName: "",
    phone: "",
    people: "",
    tableNo: "",
  };

  saveData();
  render();
}

function roomCardHtml(room) {
  const list = getQueueUsers(room.key);

  return `
    <section class="card room-card">
      <div class="top-line ${room.key === "big" ? "orange" : "blue"}"></div>
      <div class="room-head">
        <div>
          <h3>${escapeHtml(room.label)}</h3>
          <p>${escapeHtml(room.size)}</p>
        </div>
        <button class="btn btn-orange" onclick="handleReserve('${room.key}')">대기 등록</button>
      </div>

      ${
        list.length === 0
          ? `<div class="pc-empty">대기 없음</div>`
          : `<div class="pc-queue-list">
              ${list
                .map(
                  (user, index) => `
                    <div class="pc-queue-item ${index === 0 ? "first" : ""}">
                      <div class="pc-rank">${index + 1}순위</div>
                      <div class="pc-team-wrap">
                        <div class="pc-team">${escapeHtml(user.teamName)}</div>
                        <div class="pc-wait">${getRemainingMinutes(room.key, index)}분</div>
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>`
      }
    </section>
  `;
}

function adminQueueCardHtml(queueKey, title) {
  const users = getQueueUsers(queueKey).map((user, index) => ({
    ...user,
    waitNo: index + 1,
  }));
  const isBoardgame = queueKey === "boardgame";

  return `
    <section class="card admin-queue-card">
      <div class="top-line ${
        queueKey === "big" ? "orange" : queueKey === "boardgame" ? "green" : "blue"
      }"></div>

      <h3 class="section-title">${escapeHtml(title)}</h3>

      ${
        users.length === 0
          ? `<div class="empty-text">현재 대기 없음</div>`
          : `<div class="admin-queue-list">
              ${users
                .map(
                  (user) => `
                    <div class="admin-queue-item">
                      <div class="admin-queue-top">
                        <div class="queue-name">${user.waitNo}순위 · ${escapeHtml(user.teamName)}</div>
                        <div class="queue-phone">${escapeHtml(maskPhone(user.phone))}</div>
                      </div>

                      ${
                        !isBoardgame
                          ? `<div class="queue-meta">
                              <span>인원 ${escapeHtml(user.people || "-")}명</span>
                              <span>테이블 ${escapeHtml(user.tableNo || "-")}</span>
                            </div>`
                          : `<div class="queue-meta">
                              <span>로그인 시간 ${escapeHtml(user.boardgameJoinedAt || "-")}</span>
                            </div>`
                      }

                      <div class="admin-actions">
                        <button class="btn btn-red" onclick="removeFromQueue('${queueKey}', '${user.id}')">입장</button>
                      </div>
                    </div>
                  `
                )
                .join("")}
            </div>`
      }
    </section>
  `;
}

function customerScreenHtml() {
  const currentUser = getCurrentUser();

  return `
    <div class="layout two-col">
      <div class="left-col">
        ${
          !currentUser
            ? `
              <section class="card">
                <h2 class="big-title">고객 로그인</h2>

                <div class="form-group">
                  <label>팀이름</label>
                  <input
                    type="text"
                    value="${escapeHtml(state.customerForm.teamName)}"
                    oninput="updateCustomerForm('teamName', this.value)"
                    placeholder="예: 또야팀"
                  />
                </div>

                <div class="form-group">
                  <label>전화번호</label>
                  <input
                    type="text"
                    value="${escapeHtml(state.customerForm.phone)}"
                    oninput="updateCustomerForm('phone', onlyNumber(this.value)); this.value=onlyNumber(this.value)"
                    placeholder="숫자만 입력"
                  />
                </div>

                <button class="btn btn-orange full" onclick="handleCustomerLogin()">로그인</button>
              </section>
            `
            : `
              <section class="card">
                <h2 class="big-title">정보 입력</h2>

                <div class="user-box">
                  <div class="user-name">${escapeHtml(currentUser.teamName)}</div>
                  <div class="user-info">전화번호 ${escapeHtml(maskPhone(currentUser.phone))}</div>
                  <div class="user-info">예약 포인트 ${escapeHtml(currentUser.points || 0)}개</div>
                  <div class="user-info">보드게임 ${escapeHtml(currentUser.boardgamePoint || 0)}개</div>
                </div>

                <div class="form-group">
                  <label>인원수</label>
                  <input
                    type="text"
                    value="${escapeHtml(state.customerForm.people)}"
                    oninput="updateCustomerForm('people', onlyNumber(this.value)); this.value=onlyNumber(this.value)"
                    placeholder="예: 4"
                  />
                </div>

                <div class="form-group">
                  <label>테이블 번호</label>
                  <input
                    type="text"
                    value="${escapeHtml(state.customerForm.tableNo)}"
                    oninput="updateCustomerForm('tableNo', this.value)"
                    placeholder="예: A-3"
                  />
                </div>

                <div class="btn-stack">
                  <button class="btn btn-blue full" onclick="handleCustomerSaveStep2()">저장</button>
                  <button class="btn btn-dark full" onclick="logoutCustomer()">다른 팀으로 다시 로그인</button>
                </div>
              </section>
            `
        }
      </div>

      <div class="right-col">
        <h2 class="big-title right-title">실시간 대기 현황</h2>
        <div class="room-grid">
          ${ROOM_OPTIONS.map(roomCardHtml).join("")}
        </div>
      </div>
    </div>
  `;
}

function pcScreenHtml() {
  const boardgameUsers = getBoardgameUsers();

  return `
    <div class="pc-wrap">
      <section class="card hero-card">
        <div>
          <h2 class="pc-main-title">고스트팡 실시간 대기 현황</h2>
          <p class="pc-sub">TV / 모니터 전체화면용</p>
        </div>

        <div class="tab-row">
          <button class="btn ${state.pcTab === "rooms" ? "btn-orange" : "btn-tab"}" onclick="setPcTab('rooms')">게임방 대기</button>
          <button class="btn ${state.pcTab === "boardgame" ? "btn-orange" : "btn-tab"}" onclick="setPcTab('boardgame')">보드게임 사용자</button>
        </div>
      </section>

      ${
        state.pcTab === "rooms"
          ? `
            <div class="pc-room-grid">
              ${ROOM_OPTIONS.map((room) => {
                const list = getQueueUsers(room.key);

                return `
                  <section class="card pc-room-card">
                    <div class="top-line ${room.key === "big" ? "orange" : "blue"}"></div>
                    <div class="pc-room-title">${escapeHtml(room.label)}</div>
                    <div class="pc-room-size">${escapeHtml(room.size)}</div>

${
  list.length === 0
    ? `<div class="pc-empty">대기 없음</div>`
    : `<div class="pc-queue-list">
        ${list
          .map(
            (user, index) => `
              <div class="queue-item ${index === 0 ? "first" : ""}">
                <div class="rank">${index + 1}순위</div>
                <div class="team-wrap">
                  <div class="team">${escapeHtml(user.teamName)}</div>
                  <div class="wait-time">${getRemainingMinutes(room.key, index)}분</div>
                </div>
              </div>
            `
          )
          .join("")}
      </div>`
}
                  </section>
                `;
              }).join("")}
            </div>
          `
          : `
            <section class="card pc-board-card">
              <div class="top-line green"></div>
              <div class="pc-room-title center">보드게임 사용자</div>

              ${
                boardgameUsers.length === 0
                  ? `<div class="pc-empty">현재 없음</div>`
                  : `
                    <div class="pc-board-grid">
                      ${boardgameUsers
                        .map(
                          (user, index) => `
                            <div class="pc-board-item">
                              <div class="pc-board-rank">${index + 1}순서</div>
                              <div class="pc-board-team">${escapeHtml(user.teamName)}</div>
                              <div class="pc-board-time">로그인 시간 ${escapeHtml(user.boardgameJoinedAt || "-")}</div>
                            </div>
                          `
                        )
                        .join("")}
                    </div>
                  `
              }
            </section>
          `
      }
    </div>
  `;
}

function adminScreenHtml() {
  const users = getFilteredUsers();

  if (!state.adminLoggedIn) {
    return `
      <div class="admin-login-wrap">
        <section class="card admin-login-card">
          <h2 class="big-title">관리자 로그인</h2>

          <div class="form-group">
            <input
              type="password"
              value="${escapeHtml(state.adminPasswordInput)}"
              oninput="updateAdminPassword(this.value)"
              placeholder="비밀번호 입력"
            />
          </div>

          <button class="btn btn-orange full" onclick="handleAdminLogin()">로그인</button>
        </section>
      </div>
    `;
  }

  return `
    <div class="layout two-col admin-layout">
      <div class="left-col">
        <section class="card">
          <h2 class="big-title">고객 검색 / 포인트 지급</h2>

<div class="form-group">
  <input
    type="text"
    value="${escapeHtml(state.searchKeyword)}"
    oninput="updateSearchKeyword(this.value)"
    placeholder="팀명 또는 전화번호 검색"
  />
</div>

<div class="point-row" style="margin-bottom:12px;">
  <button class="btn btn-tab" onclick="showAllUsersList()">고객전체보기</button>
</div>

<div class="user-list">
  ${
    !state.searchKeyword.trim() && !state.showAllUsers
      ? `<div class="empty-text">검색어를 입력하거나 고객전체보기를 눌러주세요.</div>`
      : users.length === 0
        ? `<div class="empty-text">검색 결과가 없습니다.</div>`
        : users
            .map(
                      (user) => `
                          <div class="user-item">
                            <button class="delete-user-btn" onclick="deleteUser('${user.id}')">✕</button>

                          <div class="user-item-top">
                            <div class="user-item-name">${escapeHtml(user.teamName)}</div>
                            <div class="user-item-phone">${escapeHtml(maskPhone(user.phone))}</div>
                          </div>

                          <div class="user-item-meta">
                            <span>인원 ${escapeHtml(user.people || "-")}명</span>
                            <span>테이블 ${escapeHtml(user.tableNo || "-")}</span>
                            <span>포인트 ${escapeHtml(user.points || 0)}개</span>
                            <span>보드게임 ${escapeHtml(user.boardgamePoint || 0)}개</span>
                          </div>

                          <div class="point-row">
                           ${[1,2,3,4,5].map(n => `
                            <button class="btn btn-point-minus" onclick="subtractPoints('${user.id}', ${n})">-${n}</button>
                            `).join("")}
                          </div>

                          <div class="point-row">
                            ${[1,2,3,4,5].map(n => `
                              <button class="btn btn-point" onclick="givePoints('${user.id}', ${n})">+${n}</button>
                            `).join("")}
                          </div>

                          <div class="point-row">
                              <button class="btn btn-green" onclick="giveBoardgamePoint('${user.id}')">보드게임 1지급</button>
                          </div>
                        </div>
                      `
                    )
                    .join("")
            }
          </div>
        </section>
      </div>

      <div class="right-col">
        <section class="card sticky-top">
          <div class="admin-header-row">
            <h2 class="big-title">관리자용 대기 현황</h2>
            <button class="btn btn-tab" onclick="setScreen('customer')">고객화면으로</button>
          </div>
        </section>

<div class="admin-room-grid">
  ${adminQueueCardHtml("big", "큰방")}
  ${adminQueueCardHtml("small1", "작은방1")}
  ${adminQueueCardHtml("small2", "작은방2")}
</div>

<div class="admin-board-section">
  ${adminQueueCardHtml("boardgame", "보드게임 사용자")}
</div>

</div>
</div>
`;
}

function renderHeader() {
  return `
    <header class="top-header">
      <div>
        <h1>고스트팡을 찾아주셔서 감사합니다.</h1>
        <p>해당 인원 수에 맞게 방을 선택해 주세요</p>
        <p>(무료로 입장한 미취학 아동은 인원수에 포함되지 않습니다)</p>
      </div>

      <div class="top-tabs">
        ${
          state.screen === "admin" || state.screen === "pc"
            ? `
              <button class="btn btn-tab" onclick="setScreen('admin')">관리자 화면</button>
              <button class="btn btn-tab" onclick="setScreen('pc')">PC용 화면</button>
            `
            : `
              <button class="btn btn-tab" onclick="setScreen('customer')">고객용 화면</button>
              <button class="btn btn-tab" onclick="setScreen('guide')">게임방법보기</button>
            `
        }
      </div>
    </header>
  `;
}


  

function render() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="page">
      <div class="container">
        ${renderHeader()}
        ${renderScreen()}
      </div>
    </div>
  `;
}

function guideScreenHtml() {
  return `
    <div class="guide-wrap">
      <h2 class="big-title">게임 방법 안내</h2>

      <div style="margin-top:20px;">
        <iframe 
          width="100%" 
          height="600" 
          src="https://www.youtube.com/embed/Nar0Uy9O5iQ?autoplay=1&mute=0&loop=1&playlist=Nar0Uy9O5iQ"
          allow="autoplay; encrypted-media"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  `;
}

window.setScreen = setScreen;
window.setPcTab = setPcTab;
window.updateCustomerForm = updateCustomerForm;
window.updateAdminPassword = updateAdminPassword;
window.updateSearchKeyword = updateSearchKeyword;
window.handleCustomerLogin = handleCustomerLogin;
window.handleCustomerSaveStep2 = handleCustomerSaveStep2;
window.logoutCustomer = logoutCustomer;
window.handleReserve = handleReserve;
window.handleAdminLogin = handleAdminLogin;
window.givePoints = givePoints;
window.subtractPoints = subtractPoints;
window.deleteUser = deleteUser;
window.giveBoardgamePoint = giveBoardgamePoint;
window.removeFromQueue = removeFromQueue;
window.resetAll = resetAll;
window.onlyNumber = onlyNumber;
window.showAllUsersList = showAllUsersList;

setInterval(() => {
  if (state.screen === "pc" || state.screen === "customer" || state.screen === "admin") {
    render();
  }
}, 60000);
loadData();
syncScreenWithHash();
