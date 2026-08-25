import { DATA_DOC, getDoc, setDoc, onSnapshot } from "./firebase.js";
const ADMIN_PASSWORD = "0702";

const ROOM_OPTIONS = [
  { key: "big", label: "빅보스룸", size: "3~6인" },
  { key: "small1", label: "고스트룸1", size: "2~4인" },
  { key: "small2", label: "고스트룸2", size: "2~4인" },
];

const initialData = {
  users: [],
  queues: {
    big: [],
    small1: [],
    small2: [],
    boardgame: [],
  },
};

let state = {
  screen: "customer", // customer | pc | admin
  pcTab: "rooms", // rooms | boardgame
  currentUserId: null,
  adminLoggedIn: false,
  adminPasswordInput: "",
 searchKeyword: "",
braceletInputs: {},
spokenQueueIds: {},
voiceUnlocked: false,
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

    const isCustomerLoginTyping =
      state.screen === "customer" && !state.currentUserId;

    if (!isCustomerLoginTyping) {
      render();
    }
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

async function fixQueueDataOnce() {
  const roomKeys = ["big", "small1", "small2"];
  let changed = false;

  roomKeys.forEach((key) => {
    const queue = state.data.queues?.[key] || [];

    state.data.queues[key] = queue
      .map((item, index) => {
        if (typeof item === "string") {
          changed = true;
          return {
            userId: item,
            startAt: getNowMinute() + index * 16,
          };
        }

        if (!item || typeof item.userId !== "string") {
          changed = true;
          return null;
        }

        return item;
      })
      .filter(Boolean);
  });

  if (changed) {
    await saveData();
  }
}

function onlyNumber(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function getRoomLabel(queueKey) {
  if (queueKey === "big") return "빅보스룸";
  if (queueKey === "small1") return "고스트룸1";
  if (queueKey === "small2") return "고스트룸2";
  return "";
}

function speakPcGuide(text) {
  if (!state.voiceUnlocked) return;
  if (!window.speechSynthesis) return;

  const utter = new SpeechSynthesisUtterance(text);
utter.lang = "ko-KR";
utter.rate = 0.85;
utter.pitch = 1.4;

const voices = window.speechSynthesis.getVoices();

console.log(voices);

const koreanVoice = voices.find(v =>
  v.name.includes("Heami")
);

if (koreanVoice) {
  utter.voice = koreanVoice;
}

  window.speechSynthesis.speak(utter);
}

function checkPcVoiceGuide() {
  if (state.screen !== "pc") return;
  if (state.pcTab !== "rooms") return;
  if (!state.voiceUnlocked) return;

  ["big", "small1", "small2"].forEach((queueKey) => {
    const queue = state.data.queues?.[queueKey] || [];

    queue.forEach((item, index) => {
      if (!item || typeof item === "string") return;

      const remaining = getRemainingMinutes(queueKey, index);
      const user = getUserById(item.userId);

      if (!user) return;

      console.log("음성체크", queueKey, user.teamName, remaining);
      const speakKey = `${queueKey}_${item.userId}_${item.startAt}`;

     if (remaining <= 2 && !state.spokenQueueIds[speakKey]) {
        state.spokenQueueIds[speakKey] = true;

        speakPcGuide(
          `${user.teamName}팀은 ${getRoomLabel(queueKey)} 앞으로 대기해 주세요`
        );
      }
    });
  });
}

function unlockPcVoice() {
  state.voiceUnlocked = true;
  state.spokenQueueIds = {};

  const utter = new SpeechSynthesisUtterance("음성 안내를 시작합니다");
  utter.lang = "ko-KR";

  window.speechSynthesis.speak(utter);

  render();

  setTimeout(() => {
    checkPcVoiceGuide();
  }, 1500);
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
  const queue = state.data.queues?.[queueKey] || [];
  const item = queue[index];

  if (!item || typeof item === "string" || typeof item.startAt !== "number") {
    return (index + 1) * 16;
  }

  const nowMinute = getNowMinute();
  return Math.max(0, item.startAt - nowMinute);
}

function getCurrentUser() {
  return state.data.users.find((u) => u.id === state.currentUserId) || null;
}

function getUserById(id) {
  return state.data.users.find((u) => u.id === id) || null;
}

function getQueueUsers(queueKey) {
  const queue = state.data.queues?.[queueKey] || [];
  return queue
    .map((q) => {
      if (typeof q === "string") return getUserById(q);
      return getUserById(q.userId);
    })
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
  const hasTextKeyword = keyword.length > 0;
  const hasNumberKeyword = numberKeyword.length > 0;

  return state.data.users.filter((u) => {
    const teamName = String(u.teamName || "").trim();
    const phone = onlyNumber(u.phone);

    const matchTeamName = hasTextKeyword && teamName.includes(keyword);
    const matchPhone = hasNumberKeyword && phone.includes(numberKeyword);

    return matchTeamName || matchPhone;
  });
}

function getUsersNeverReceivedPoints() {
  return state.data.users.filter((u) => {
    const neverReceivedPoints =
      (u.totalPointsReceived || 0) === 0;

    const waitingForBracelet =
      (u.lastGrantedPoints || 0) > 0;

    return neverReceivedPoints || waitingForBracelet;
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
  state.showAllUsers = false;
}

function updateBraceletInput(userId, value) {
  state.braceletInputs[userId] = onlyNumber(value);
}

async function handleBraceletRegister(userId) {
  const user = getUserById(userId);
  if (!user) return;

  const braceletNumber = state.braceletInputs[userId] || "";
  const grantedPoints = user.lastGrantedPoints || 0;

  if (!braceletNumber) {
    alert("팔찌번호를 스캔해주세요.");
    return;
  }

  const payload = {
  memberName: user.teamName,
  phone: user.phone,
  icCardNumber: braceletNumber,
  cardCount: grantedPoints,

  // 기존에 발급된 제조사 회원이라면 memberId도 전송
  memberId: user.manufacturerMemberId || ""
};

  try {
    const response = await fetch(
      "http://127.0.0.1:8787/api/test-register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error("팔찌 등록 실패:", result);

      alert(
        result.message ||
        result.error ||
        "팔찌 등록에 실패했습니다."
      );

      return;
    }

    const cardTimePerPoint = 900;
    const totalSeconds = grantedPoints * cardTimePerPoint;
    const minutes = grantedPoints * 15;

    alert(
      `${user.teamName}팀 팔찌 등록이 완료되었습니다.\n\n` +
      `팔찌번호: ${braceletNumber}\n` +
      `지급 포인트: ${grantedPoints}\n` +
      `Card Time: ${cardTimePerPoint}초 (1포인트당 15분)\n` +
      `총 이용시간: ${totalSeconds}초 (${minutes}분)\n` +
      `Charge Amount: ${grantedPoints}`

    // 최초 등록 때 받은 제조사 회원 ID와 팔찌번호 저장
if (result.memberId) {
  user.manufacturerMemberId = result.memberId;
}

user.registeredBraceletNumber = braceletNumber;

// 팔찌등록이 완료됐으므로 별도 지급 포인트 초기화
user.lastGrantedPoints = 0;

// 팔찌 입력칸 초기화
state.braceletInputs[userId] = "";

await saveData();
render();

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
      totalPointsReceived: 0,
      boardgamePoint: 0,
      boardgameJoinedAt: "",
      createdAt: Date.now(),
    };
    state.data.users.push(user);
  }

  state.currentUserId = user.id;
  state.customerForm.people = user.people || "";
  state.customerForm.tableNo = user.tableNo || "";

  saveData();
  render();
}

function checkAdminAutoLogin() {
  const saved = localStorage.getItem("adminLoginTime");
  if (!saved) return;

  const loginTime = Number(saved);
  const now = Date.now();

  const THREE_HOURS = 1000 * 60 * 60 * 3;

  if (now - loginTime < THREE_HOURS) {
    state.adminLoggedIn = true;
  } else {
    localStorage.removeItem("adminLoginTime");
  }
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

  const people = Number(currentUser.people || 0);

if (queueKey === "big" && (people < 3 || people > 6)) {
  alert("빅보스룸은 3~6인만 이용 가능합니다.");
  return;
}

  if (isAlreadyInQueue(queueKey, currentUser.id)) {
    alert("이미 해당 대기열에 등록되어 있습니다.");
    return;
  }

  currentUser.points = (currentUser.points || 0) - 1;

  const queue = state.data.queues[queueKey];
  const nowMinute = getNowMinute();

  queue.push({
    userId: currentUser.id,
    startAt: nowMinute + (queue.length + 1) * 16
  });

  saveData();
  render();
}

function adminAddQueue(queueKey, userId) {
  const queue = state.data.queues[queueKey];
  const nowMinute = getNowMinute();

  queue.push({
    userId,
    startAt: nowMinute + (queue.length + 1) * 16,
  });

  saveData();
  render();
}

function adminCreateWalkIn(queueKey) {
  const teamName = prompt("팀명을 입력해주세요.");
  if (!teamName) return;

  const people = prompt("인원수를 입력해주세요.") || "";
  const tableNo = prompt("테이블 번호를 입력해주세요.") || "";

  const user = {
    id: makeId(),
    teamName: teamName.trim(),
    phone: "",
    people: onlyNumber(people),
    tableNo: tableNo.trim(),
    points: 0,
    totalPointsReceived: 0,
    boardgamePoint: 0,
    boardgameJoinedAt: "",
    createdAt: Date.now(),
  };

  state.data.users.push(user);

  const queue = state.data.queues[queueKey];
  const nowMinute = getNowMinute();

  queue.push({
    userId: user.id,
    startAt: nowMinute + (queue.length + 1) * 16,
  });

  saveData();
  render();
}

function handleAdminLogin() {
  if (state.adminPasswordInput === ADMIN_PASSWORD) {
    state.adminLoggedIn = true;
    localStorage.setItem("adminLoginTime", Date.now());
    state.screen = "admin";
    render();
  } else {
    alert("관리자 비밀번호가 올바르지 않습니다.");
  }
}

function givePoints(userId, amount) {
  const user = getUserById(userId);
  if (!user) return;

  // 기존 대기시스템 포인트에 추가
  user.points = (user.points || 0) + amount;
  user.totalPointsReceived = (user.totalPointsReceived || 0) + amount;

  // 이번에 지급한 포인트를 팔찌 등록용으로 별도 기록
  user.lastGrantedPoints = amount;

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

state.data.queues.big = state.data.queues.big.filter((q) => q.userId !== userId);
state.data.queues.small1 = state.data.queues.small1.filter((q) => q.userId !== userId);
state.data.queues.small2 = state.data.queues.small2.filter((q) => q.userId !== userId);
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

  if (!isAlreadyInQueue("boardgame", userId)) {
    state.data.queues.boardgame.push({
      userId: userId,
      startAt: getNowMinute()
    });
  }

  saveData();
  render();
}

function removeFromQueue(queueKey, userId) {
  const queue = state.data.queues[queueKey];

  const index = queue.findIndex((q) =>
    typeof q === "string" ? q === userId : q.userId === userId
  );
  if (index === -1) return;

  queue.splice(index, 1);

  if (queueKey !== "boardgame") {
    const nowMinute = getNowMinute();

    queue.forEach((item, i) => {
      if (typeof item !== "string") {
        item.startAt = nowMinute + (i + 1) * 16;
      }
    });
  }

  if (queueKey === "boardgame") {
    const user = getUserById(userId);
    if (user) {
      user.boardgamePoint = 0;
      user.boardgameJoinedAt = "";
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
                        <button class="btn btn-red" onclick="removeFromQueue('${queueKey}', '${user.id}')">
                          ${isBoardgame ? "퇴장" : "입장"}
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
                    onkeydown="if(event.key==='Enter'){handleCustomerLogin();}"
                    placeholder="예: 또야팀"
                  />
                </div>

                <div class="form-group">
                  <label>전화번호</label>
                  <input
                    type="text"
                    value="${escapeHtml(state.customerForm.phone)}"
                    oninput="updateCustomerForm('phone', onlyNumber(this.value)); this.value=onlyNumber(this.value)"
                    onkeydown="if(event.key==='Enter'){handleCustomerLogin();}"
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
                    placeholder="예: 3"
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
  <p class="pc-sub">예상 대기시간 확인 후 신발을 갈아신어 주세요</p>

  <button class="btn btn-orange" onclick="unlockPcVoice()">
    음성 안내 시작
  </button>
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
                <div class="line">
                  <span>${index + 1}순위</span>
                  <span>${escapeHtml(user.teamName)}</span>
                  <span>${getRemainingMinutes(room.key, index)}분</span>
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
const users = state.searchKeyword.trim()
  ? getFilteredUsers()
  : state.showAllUsers
    ? state.data.users
    : getUsersNeverReceivedPoints();

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
              onkeydown="if(event.key==='Enter'){handleAdminLogin();}"
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

          <div class="walkin-buttons">
  <button class="btn btn-orange" onclick="adminCreateWalkIn('big')">현장접수 빅보스룸</button>
  <button class="btn btn-blue" onclick="adminCreateWalkIn('small1')">현장접수 고스트룸1</button>
  <button class="btn btn-blue" onclick="adminCreateWalkIn('small2')">현장접수 고스트룸2</button>
</div>

          <div class="form-group">
            <input
              type="text"
              value="${escapeHtml(state.searchKeyword)}"
              oninput="updateSearchKeyword(this.value)"
              onkeydown="if(event.key==='Enter'){runAdminSearch();}"
              placeholder="팀명 또는 전화번호 검색"
            />
          </div>

          <div class="point-row" style="margin-bottom:12px;">
            <button class="btn btn-orange" onclick="runAdminSearch()">검색</button>
            <button class="btn btn-tab" onclick="showAllUsersList()">고객전체보기</button>
          </div>

          <div class="user-list">
           ${
  users.length === 0
    ? `<div class="empty-text">${
        state.searchKeyword.trim()
          ? "검색 결과가 없습니다."
          : "아직 포인트를 한 번도 받지 않은 고객이 없습니다."
      }</div>`
    : users.map((user) => `
        <div class="user-item">
          <button class="delete-user-btn" onclick="deleteUser('${user.id}')">✕</button>

          <div class="user-item-top">
            <div class="user-name">
              ${escapeHtml(user.teamName)}
              <span class="user-phone">(${escapeHtml(maskPhone(user.phone))})</span>
            </div>
          </div>

          <div class="point-bracelet-row">
  <div class="point-button-group">
    ${[1, 2, 3].map(n => `
      <button
        class="btn btn-point"
        onclick="givePoints('${user.id}', ${n})"
      >
        +${n}
      </button>
    `).join("")}

    <button
      class="btn btn-red point-minus-btn"
      onclick="subtractPoints('${user.id}', 1)"
    >
      -1
    </button>
  </div>

  <div class="bracelet-register-group">
    <input
      class="bracelet-number-input"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      value="${escapeHtml(state.braceletInputs[user.id] || "")}"
      oninput="
        updateBraceletInput('${user.id}', this.value);
        this.value = onlyNumber(this.value);
      "

      placeholder="팔찌번호 스캔"
    />

    <button
      class="btn btn-blue bracelet-register-btn"
      onclick="handleBraceletRegister('${user.id}')"
    >
      팔찌등록
    </button>
  </div>
</div>

          <div class="user-item-bottom">
            <div class="user-item-meta">
              <span>인원 ${escapeHtml(user.people || "-")}명</span>
              <span>테이블 ${escapeHtml(user.tableNo || "-")}</span>
              <span>포인트 ${escapeHtml(user.points || 0)}개</span>
            </div>

            <button class="btn btn-green boardgame-btn" onclick="giveBoardgamePoint('${user.id}')">
              보드게임 지급
            </button>
            <details class="admin-wait-box">
  <summary>대기등록 (강제등록 가능)</summary>
  <div class="admin-force-notice">
  ※ 관리자 강제등록 가능
</div>

  <div class="admin-wait-buttons">
    <button class="btn btn-orange" onclick="adminAddQueue('big', '${user.id}')">빅보스룸</button>
    <button class="btn btn-blue" onclick="adminAddQueue('small1', '${user.id}')">고스트룸1</button>
    <button class="btn btn-blue" onclick="adminAddQueue('small2', '${user.id}')">고스트룸2</button>
  </div>
</details>
          </div>
        </div>
      `).join("")
}
          </div>
        </section>
      </div>

      <div class="right-col">
        <section class="card sticky-top">
          <div class="admin-header-row">
            <h2 class="big-title">관리자용 대기 현황</h2>
            <details class="admin-menu-box">
  <summary>고객화면으로</summary>

  <button class="btn btn-tab" onclick="setScreen('customer')">
    고객화면으로
  </button>
</details>
          </div>
        </section>

        <div class="admin-room-grid">
          ${adminQueueCardHtml("big", "빅보스룸")}
          ${adminQueueCardHtml("small1", "고스트룸1")}
          ${adminQueueCardHtml("small2", "고스트룸2")}
        </div>

        <div class="admin-board-section">
          ${adminQueueCardHtml("boardgame", "보드게임 사용자")}
        </div>
      </div>
    </div>
  `;
}

function isAlreadyInQueue(queueKey, userId) {
  const queue = state.data.queues[queueKey] || [];
  return queue.some((q) => {
    if (typeof q === "string") return q === userId;
    return q.userId === userId;
  });
}

function renderHeader() {
  return `
    <header class="top-header">
      <div>
        <h1>고스트팡을 찾아주셔서 감사합니다.</h1>
        <p>해당 인원 수에 맞게 방을 선택해 주세요</p>
        <p>(무료로 입장한 미취학 아동은 인원수에 포함되지 않습니다)</p>
        <p>인원수,테이블번호 저장 후 ★대기등록★해주셔야합니다</p>
        <p>*빅보스룸은 가장 큰 방으로, 처음하시거나 어린친구들에게는 고스트룸을 추천드립니다.</p>
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

function updateUserTable(userId, value) {
  const user = getUserById(userId);
  if (!user) return;

  user.tableNo = value;
  saveData();
  render();
}


  
function renderScreen() {
  if (state.screen === "customer") return customerScreenHtml();
  if (state.screen === "pc") return pcScreenHtml();
  if (state.screen === "admin") return adminScreenHtml();
  if (state.screen === "guide") return guideScreenHtml();
  return customerScreenHtml();
}

function cleanupOldUsers() {
  const now = Date.now();

  state.data.users = state.data.users.filter((u) => {
    const created = new Date(u.createdAt).getTime();
    if (Number.isNaN(created)) return true;
    return now - created < 1000 * 60 * 60 * 6;
  });
}

function render() {
  // 화면을 다시 그리기 전 현재 스크롤 위치 기억
  const currentUserList = document.querySelector(".user-list");
  const savedUserListScrollTop = currentUserList
    ? currentUserList.scrollTop
    : 0;

  const savedPageScrollY = window.scrollY;

  const app = document.getElementById("app");

  if (!app) {
    console.error("app 요소를 찾을 수 없습니다.");
    return;
  }

  app.innerHTML = `
    <div class="page">
      <div class="container">
        ${renderHeader()}
        ${renderScreen()}
      </div>
    </div>
  `;

  // 화면을 다시 그린 후 기존 고객 목록 스크롤 위치 복원
  const nextUserList = document.querySelector(".user-list");

  if (nextUserList) {
    nextUserList.scrollTop = savedUserListScrollTop;
  }

  window.scrollTo(0, savedPageScrollY);

  checkPcVoiceGuide();
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

function runAdminSearch() {
  state.showAllUsers = false;
  render();
}

function loadVoiceList() {
  const voices = window.speechSynthesis.getVoices();

  console.log("사용 가능한 음성 목록:", voices);

  voices.forEach((v, i) => {
    console.log(`${i}: ${v.name} / ${v.lang}`);
  });
}

window.speechSynthesis.onvoiceschanged = loadVoiceList;

window.runAdminSearch = runAdminSearch;
window.setScreen = setScreen;
window.setPcTab = setPcTab;
window.updateCustomerForm = updateCustomerForm;
window.updateAdminPassword = updateAdminPassword;
window.updateSearchKeyword = updateSearchKeyword;
window.updateBraceletInput = updateBraceletInput;
window.handleBraceletRegister = handleBraceletRegister;
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
window.updateUserTable = updateUserTable;
window.adminAddQueue = adminAddQueue;
window.adminCreateWalkIn = adminCreateWalkIn;
window.unlockPcVoice = unlockPcVoice;
window.loadVoiceList = loadVoiceList;

setInterval(() => {
  const now = Date.now();

  if (state.screen === "pc") {
    render();
    return;
  }

  if (state.screen === "customer" && state.currentUserId) {
    if (!state.lastCustomerRenderAt) {
      state.lastCustomerRenderAt = now;
      render();
      return;
    }

    if (now - state.lastCustomerRenderAt >= 10000) {
      state.lastCustomerRenderAt = now;
      render();
    }

    return;
  }

  if (state.screen === "admin") {
    if (!state.lastAdminRenderAt) {
      state.lastAdminRenderAt = now;
      render();
      return;
    }

    if (now - state.lastAdminRenderAt >= 30000) {
      state.lastAdminRenderAt = now;
      render();
    }
  }

}, 1000);

async function loadData() {
  const snap = await getDoc(DATA_DOC);

  if (snap.exists()) {
    state.data = snap.data();
  } else {
    await setDoc(DATA_DOC, state.data);
  }
}

setTimeout(() => {
  loadVoiceList();
}, 2000);

loadData().then(async () => {
  await fixQueueDataOnce();
  checkAdminAutoLogin(); 
  syncScreenWithHash();
  render();
});





