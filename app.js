import {
  db,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc
} from "./firebase.js";

const app = document.getElementById("app");
const ADMIN_PASSWORD = "0702";
const TEAMS_COLLECTION = "teams";

const ROOM_OPTIONS = [
  { key: "big", label: "큰방1", size: "3~6인", line: "line-orange" },
  { key: "small1", label: "작은방1", size: "2~4인", line: "line-blue" },
  { key: "small2", label: "작은방2", size: "2~4인", line: "line-blue" }
];

const BOARDGAME_KEY = "boardgame";

let state = {
  adminHintCount: 0,
  showAdminEntry: false,
  mode: "customer",
  pcScreenTab: "rooms",
  adminOpen: false,
  adminPassword: "",
  customerForm: {
    teamName: "",
    phone: "",
    people: "",
    tableNo: ""
  },
  currentUserId: localStorage.getItem("ghostpang_current_user_id") || null,
  searchKeyword: "",
  teams: [],
  ready: false
};

const teamsRef = collection(db, TEAMS_COLLECTION);

function nowText() {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

function timestamp() {
  return Date.now();
}

function onlyNumber(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function maskPhone(phone) {
  const p = onlyNumber(phone);
  if (p.length < 7) return p;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  if (p.length >= 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7, 11)}`;
  return p;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setCurrentUser(id) {
  state.currentUserId = id;
  if (id) localStorage.setItem("ghostpang_current_user_id", id);
  else localStorage.removeItem("ghostpang_current_user_id");
}

function getTeamById(id) {
  return state.teams.find((team) => team.id === id) || null;
}

function getCurrentUser() {
  return getTeamById(state.currentUserId);
}

function getVisibleCustomerQueues() {
  const byRoom = {};
  ROOM_OPTIONS.forEach((room) => {
    const key = `${room.key}QueueAt`;
    byRoom[room.key] = state.teams
      .filter((team) => !!team[key])
      .sort((a, b) => a[key] - b[key]);
  });
  return byRoom;
}

function getBoardgameUsers() {
  return state.teams
    .filter((team) => team.boardgamePoint >= 1 && !!team.boardgameJoinedAt)
    .sort((a, b) => (a.boardgameJoinedAtTs || 0) - (b.boardgameJoinedAtTs || 0));
}

function getAdminFilteredUsers() {
  const keyword = state.searchKeyword.trim();
  if (!keyword) return [...state.teams].sort((a, b) => (b.createdAtTs || 0) - (a.createdAtTs || 0));
  return state.teams.filter(
    (team) =>
      team.teamName.includes(keyword) ||
      onlyNumber(team.phone).includes(onlyNumber(keyword))
  );
}

function getQueueDetailsForAdmin() {
  const result = {
    big: [],
    small1: [],
    small2: [],
    boardgame: []
  };

  ROOM_OPTIONS.forEach((room) => {
    const key = `${room.key}QueueAt`;
    result[room.key] = state.teams
      .filter((team) => !!team[key])
      .sort((a, b) => a[key] - b[key])
      .map((team, index) => ({ ...team, waitNo: index + 1 }));
  });

  result.boardgame = getBoardgameUsers().map((team, index) => ({ ...team, waitNo: index + 1 }));
  return result;
}

function isAlreadyInQueue(queueKey, team) {
  return !!team[`${queueKey}QueueAt`];
}

async function createTeam(payload) {
  await addDoc(teamsRef, payload);
}

async function patchTeam(teamId, patch) {
  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), patch);
}

async function removeTeam(teamId) {
  await deleteDoc(doc(db, TEAMS_COLLECTION, teamId));
}

async function handleCustomerLogin() {
  const teamName = state.customerForm.teamName.trim();
  const phone = onlyNumber(state.customerForm.phone);

  if (!teamName || !phone) {
    alert("팀이름과 핸드폰번호를 입력해주세요.");
    return;
  }

  let foundTeam = state.teams.find((team) => onlyNumber(team.phone) === phone);

  if (!foundTeam) {
    await createTeam({
      teamName,
      phone,
      people: "",
      tableNo: "",
      points: 0,
      boardgamePoint: 0,
      boardgameJoinedAt: "",
      boardgameJoinedAtTs: null,
      bigQueueAt: null,
      small1QueueAt: null,
      small2QueueAt: null,
      createdAt: nowText(),
      createdAtTs: timestamp()
    });
    return;
  }

  if (foundTeam.teamName !== teamName) {
    await patchTeam(foundTeam.id, { teamName });
  }

  setCurrentUser(foundTeam.id);
  render();
}

async function handleCustomerSaveStep2() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("먼저 로그인해주세요.");
    return;
  }

  const people = state.customerForm.people.trim();
  const tableNo = state.customerForm.tableNo.trim();

  if (!people || !tableNo) {
    alert("인원 수와 테이블 번호를 입력해주세요.");
    return;
  }

  await patchTeam(currentUser.id, { people, tableNo });
}

async function handleReserve(queueKey) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("먼저 로그인해주세요.");
    return;
  }

  if (!currentUser.people || !currentUser.tableNo) {
    alert("인원 수와 테이블 번호를 먼저 입력해주세요.");
    return;
  }

  if ((currentUser.points || 0) < 1) {
    alert("예약 가능한 포인트가 없습니다.");
    return;
  }

  if (isAlreadyInQueue(queueKey, currentUser)) {
    alert("이미 해당 대기열에 등록되어 있습니다.");
    return;
  }

  await patchTeam(currentUser.id, {
    points: (currentUser.points || 0) - 1,
    [`${queueKey}QueueAt`]: timestamp()
  });
}

function handleAdminLogin() {
  if (state.adminPassword === ADMIN_PASSWORD) {
    state.adminOpen = true;
    render();
  } else {
    alert("관리자 비밀번호가 올바르지 않습니다.");
  }
}

async function givePoints(teamId, amount) {
  const team = getTeamById(teamId);
  if (!team) return;
  await patchTeam(teamId, { points: (team.points || 0) + amount });
}

async function giveBoardgamePoint(teamId) {
  const team = getTeamById(teamId);
  if (!team) return;

  const patch = {
    boardgamePoint: 1
  };

  if (!team.boardgameJoinedAt) {
    patch.boardgameJoinedAt = nowText();
    patch.boardgameJoinedAtTs = timestamp();
  }

  await patchTeam(teamId, patch);
}

async function directEditPoints(teamId) {
  const team = getTeamById(teamId);
  if (!team) return;

  const value = window.prompt("변경할 일반 포인트 값을 입력해주세요.", String(team.points || 0));
  if (value === null) return;
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    alert("0 이상의 숫자만 입력해주세요.");
    return;
  }

  await patchTeam(teamId, { points: Math.floor(num) });
}

async function directEditBoardgamePoints(teamId) {
  const team = getTeamById(teamId);
  if (!team) return;

  const value = window.prompt(
    "변경할 보드게임 포인트 값을 입력해주세요. (0 또는 1 권장)",
    String(team.boardgamePoint || 0)
  );
  if (value === null) return;
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    alert("0 이상의 숫자만 입력해주세요.");
    return;
  }

  const nextValue = Math.floor(num);
  const patch = {
    boardgamePoint: nextValue
  };

  if (nextValue >= 1) {
    patch.boardgameJoinedAt = team.boardgameJoinedAt || nowText();
    patch.boardgameJoinedAtTs = team.boardgameJoinedAtTs || timestamp();
  } else {
    patch.boardgameJoinedAt = "";
    patch.boardgameJoinedAtTs = null;
  }

  await patchTeam(teamId, patch);
}

async function removeFromQueue(queueKey, teamId) {
  if (queueKey === BOARDGAME_KEY) {
    await patchTeam(teamId, {
      boardgamePoint: 0,
      boardgameJoinedAt: "",
      boardgameJoinedAtTs: null
    });
    return;
  }

  await patchTeam(teamId, {
    [`${queueKey}QueueAt`]: null
  });
}

async function enterTeam(queueKey, teamId) {
  if (queueKey === BOARDGAME_KEY) {
    await patchTeam(teamId, {
      boardgamePoint: 0,
      boardgameJoinedAt: "",
      boardgameJoinedAtTs: null
    });
    return;
  }

  await patchTeam(teamId, {
    [`${queueKey}QueueAt`]: null
  });
}

async function deleteTeam(teamId) {
  const ok = window.confirm("이 팀을 완전히 삭제할까요?");
  if (!ok) return;
  if (state.currentUserId === teamId) setCurrentUser(null);
  await removeTeam(teamId);
}

function resetAll() {
  const ok = window.confirm("전체 데이터를 초기화할까요?\n등록 고객, 포인트, 대기열이 모두 삭제됩니다.");
  if (!ok) return;

  Promise.all(state.teams.map((team) => removeTeam(team.id))).catch(() => {
    alert("초기화 중 오류가 발생했습니다.");
  });
}

function customerQueueCard(room, list) {
  return `
    <div class="card">
      <div class="card-topline ${room.line}"></div>
      <div class="flex-between" style="align-items:center; margin-bottom:12px;">
        <div>
          <div style="font-size:18px;font-weight:800;">${room.label}</div>
          <div style="font-size:13px;color:#9da7bb;margin-top:4px;">${room.size}</div>
        </div>
        <button class="btn btn-orange" onclick="handleReserve('${room.key}')">예약 등록</button>
      </div>
      ${
        list.length === 0
          ? `<div class="muted" style="font-size:14px;">현재 대기 없음</div>`
          : `<div class="grid-gap">
              ${list
                .map(
                  (team, index) => `
                  <div class="queue-row ${index === 0 ? "first" : ""}">
                    <div style="font-weight:700;">${index + 1}순위</div>
                    <div>${escapeHtml(team.teamName)}</div>
                  </div>
                `
                )
                .join("")}
            </div>`
      }
    </div>
  `;
}

function adminQueueCard(queueKey, title, list) {
  const lineClass =
    queueKey === "big" ? "line-orange" : queueKey === BOARDGAME_KEY ? "line-green" : "line-blue";
  const isBoardGame = queueKey === BOARDGAME_KEY;

  return `
    <div class="card">
      <div class="card-topline ${lineClass}"></div>
      <div style="font-size:19px;font-weight:800;margin-bottom:14px;">${title}</div>
      ${
        list.length === 0
          ? `<div class="muted" style="font-size:14px;">현재 대기 없음</div>`
          : `<div class="grid-gap">
              ${list
                .map(
                  (team) => `
                <div class="admin-queue-item">
                  <div class="flex-between">
                    <div style="font-weight:800;">${team.waitNo}순위 · ${escapeHtml(team.teamName)}</div>
                    <div style="color:#c7cedb;font-size:14px;">${maskPhone(team.phone)}</div>
                  </div>
                  ${
                    !isBoardGame
                      ? `<div class="meta-row">
                          <span>테이블 ${escapeHtml(team.tableNo || "-")}</span>
                          <span>인원 ${team.people || "-"}명</span>
                        </div>`
                      : `<div style="color:#a8b2c5;font-size:14px;">로그인 시간 ${team.boardgameJoinedAt || "-"}</div>`
                  }
                  <div class="inline-buttons" style="gap:8px;">
                    <button class="btn btn-green" style="padding:10px 14px;" onclick="enterTeam('${queueKey}','${team.id}')">입장</button>
                    <button class="btn btn-red" style="padding:10px 14px;" onclick="removeFromQueue('${queueKey}','${team.id}')">삭제</button>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>`
      }
    </div>
  `;
}

function triggerHiddenAdmin() {
  state.adminHintCount += 1;

  if (state.adminHintCount >= 5) {
    state.showAdminEntry = true;
    state.adminHintCount = 0;
    render();
    return;
  }

  clearTimeout(window.__ghostpangAdminHintTimer);
  window.__ghostpangAdminHintTimer = setTimeout(() => {
    state.adminHintCount = 0;
  }, 1800);
}

function closeHiddenAdmin() {
  state.showAdminEntry = false;
  state.adminPassword = "";
  render();
}

function render() {
  if (!state.ready) {
    app.innerHTML = `
      <div class="page">
        <div class="wrap">
          <div class="card" style="text-align:center; padding:40px;">
            <div class="section-title" style="margin-bottom:0;">불러오는 중...</div>
          </div>

                <div style="margin-top:30px;">
                  <button class="btn btn-gray" style="width:100%; opacity:0.6;" onclick="resetAll()">전체 초기화</button>
                </div>
              </div>
            </div>
          </div>
        `;
    return;
  }

  const currentUser = getCurrentUser();
  const boardgameUsers = getBoardgameUsers();
  const visibleQueues = getVisibleCustomerQueues();
  const adminFilteredUsers = getAdminFilteredUsers();
  const queueDetails = getQueueDetailsForAdmin();

  if (state.currentUserId && !currentUser) {
    setCurrentUser(null);
  }

  app.innerHTML = `
    <div class="page">
      <div class="wrap">
        <div class="topbar">
          <div>
            <div class="title" onclick="triggerHiddenAdmin()" style="cursor:default; user-select:none;">고스트팡 대기 시스템</div>
            <div class="subtitle">고객용 / PC용 실시간 대기 등록</div>
          </div>

          <div class="mode-buttons">
            <button class="btn ${state.mode === "customer" ? "active" : "btn-dark"}" onclick="setMode('customer')">고객용 화면</button>
            <button class="btn ${state.mode === "pc" ? "active" : "btn-dark"}" onclick="setMode('pc')">PC용 화면</button>
          </div>
        </div>

        ${
          state.mode === "customer"
            ? `
          <div class="grid-2">
            <div class="card">
              <div class="section-title">고객 로그인 / 정보입력</div>

              <div class="grid-gap">
                <div>
                  <div class="label">팀이름</div>
                  <input class="input" value="${escapeHtml(state.customerForm.teamName)}" oninput="updateCustomerForm('teamName', this.value)" placeholder="예: 또야팀" />
                </div>

                <div>
                  <div class="label">핸드폰번호</div>
                  <input class="input" value="${escapeHtml(state.customerForm.phone)}" oninput="updateCustomerForm('phone', this.value.replace(/[^0-9]/g,''))" placeholder="숫자만 입력" />
                </div>

                <button class="btn btn-orange" onclick="handleCustomerLogin()">로그인</button>
              </div>

              <div class="divider grid-gap">
                <div class="subsection-title">2단계 정보입력</div>
                <div>
                  <div class="label">인원 수</div>
                  <input class="input" value="${escapeHtml(state.customerForm.people)}" oninput="updateCustomerForm('people', this.value.replace(/[^0-9]/g,''))" placeholder="예: 4" />
                </div>
                <div>
                  <div class="label">테이블 번호</div>
                  <input class="input" value="${escapeHtml(state.customerForm.tableNo)}" oninput="updateCustomerForm('tableNo', this.value)" placeholder="예: A-3" />
                </div>
                <button class="btn btn-blue" onclick="handleCustomerSaveStep2()">정보 저장</button>
              </div>

              ${
                currentUser
                  ? `
                  <div class="info-box">
                    <div style="font-weight:900;font-size:18px;">${escapeHtml(currentUser.teamName)}</div>
                    <div class="orange-text">예약 가능 포인트: ${currentUser.points || 0}개</div>
                    <div class="orange-text">보드게임 포인트: ${currentUser.boardgamePoint || 0}개</div>
                    <div class="orange-text">인원 ${currentUser.people || "-"}명 · 테이블 ${escapeHtml(currentUser.tableNo || "-")}</div>
                  </div>
                `
                  : ""
              }

              ${
                boardgameUsers.some((team) => team.id === state.currentUserId)
                  ? `<div class="success-box">보드게임 사용자로 자동 등록되었습니다.</div>`
                  : ""
              }
            </div>

            <div class="grid-gap">
              <div class="section-title" style="margin-bottom:0;">실시간 대기화면</div>
              <div class="grid-gap">
                ${ROOM_OPTIONS.map((room) => customerQueueCard(room, visibleQueues[room.key])).join("")}
              </div>
            </div>
          </div>
        `
            : ""
        }

        ${
          state.mode === "pc"
            ? `
          <div class="grid-gap">
            <div class="card" style="padding:24px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:28px;font-weight:900;">고스트팡 실시간 대기 현황</div>
                <div style="color:#a8b2c5;margin-top:6px;font-size:15px;">PC 또는 TV 전체화면용 안내 화면</div>
              </div>

              <div class="mode-buttons">
                <button class="btn ${state.pcScreenTab === "rooms" ? "active" : "btn-dark"}" onclick="setPcTab('rooms')">게임방 대기</button>
                <button class="btn ${state.pcScreenTab === "boardgame" ? "active" : "btn-dark"}" onclick="setPcTab('boardgame')">보드게임 사용자</button>
              </div>
            </div>

            ${
              state.pcScreenTab === "rooms"
                ? `
                <div class="grid-pc">
                  ${ROOM_OPTIONS.map((room) => {
                    const list = visibleQueues[room.key];
                    return `
                      <div class="card pc-card">
                        <div class="card-topline ${room.line}"></div>
                        <div class="pc-header">
                          <div class="pc-room-title">${room.label} 대기</div>
                          <div class="pc-room-sub">${room.size}</div>
                        </div>
                        ${
                          list.length === 0
                            ? `<div class="pc-empty">대기 없음</div>`
                            : `<div class="grid-gap">
                                ${list
                                  .map(
                                    (team, index) => `
                                    <div class="pc-wait-row ${index === 0 ? "first" : ""}">
                                      <div class="pc-rank">${index + 1} 순위</div>
                                      <div class="pc-team">${escapeHtml(team.teamName)}</div>
                                    </div>
                                  `
                                  )
                                  .join("")}
                              </div>`
                        }
                      </div>
                    `;
                  }).join("")}
                </div>
              `
                : `
                <div class="card" style="padding:28px;">
                  <div class="card-topline line-green"></div>
                  <div style="text-align:center;margin-bottom:24px;">
                    <div style="font-size:32px;font-weight:900;">보드게임 사용자</div>
                    <div style="color:#9ca8bc;margin-top:6px;font-size:16px;">고객용 화면에는 팀이름과 로그인 시간만 표시됩니다.</div>
                  </div>

                  ${
                    boardgameUsers.length === 0
                      ? `<div class="pc-empty" style="min-height:420px;font-size:28px;">현재 보드게임 사용자 없음</div>`
                      : `<div class="board-grid">
                          ${boardgameUsers
                            .map(
                              (team, index) => `
                            <div class="board-user ${index === 0 ? "first" : ""}">
                              <div style="font-size:24px;font-weight:900;">${index + 1} 순서</div>
                              <div style="font-size:26px;font-weight:800;">${escapeHtml(team.teamName)}</div>
                              <div style="color:#a7b1c4;font-size:16px;">로그인 시간 ${team.boardgameJoinedAt || "-"}</div>
                            </div>
                          `
                            )
                            .join("")}
                        </div>`
                  }
                </div>
              `
            }
          </div>
        `
            : ""
        }

        ${
          state.showAdminEntry
            ? `
          <div style="position:fixed; inset:0; background:rgba(0,0,0,0.55); display:grid; place-items:center; z-index:9999; padding:20px;">
            <div class="card" style="width:100%; max-width:520px;">
              <div class="section-title" style="margin-bottom:14px;">관리자 로그인</div>
              <input class="input" type="password" value="${escapeHtml(state.adminPassword)}" oninput="updateAdminPassword(this.value)" placeholder="관리자 비밀번호 입력" />
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px;">
                <button class="btn btn-orange" onclick="handleAdminLogin()">로그인</button>
                <button class="btn btn-gray" onclick="closeHiddenAdmin()">닫기</button>
              </div>
              <div style="color:#8f98aa; font-size:13px; margin-top:12px;">상단 제목을 빠르게 5번 누르면 관리자 로그인 창이 열립니다.</div>
            </div>
          </div>
        `
            : ""
        }

        ${
          state.mode === "admin"
            ? `
          <div class="grid-gap">
            <div class="grid-2">
              <div class="card">
                <div class="section-title" style="margin-bottom:14px;">고객 검색 / 포인트 지급</div>
                <input class="input" value="${escapeHtml(state.searchKeyword)}" oninput="updateSearchKeyword(this.value)" placeholder="팀명 또는 핸드폰번호 검색" />

                <div class="search-list">
                  ${
                    adminFilteredUsers.length === 0
                      ? `<div class="muted">검색 결과가 없습니다.</div>`
                      : adminFilteredUsers
                          .map(
                            (team) => `
                          <div class="admin-item">
                            <div class="flex-between">
                              <div style="font-weight:800;">${escapeHtml(team.teamName)}</div>
                              <div style="color:#b3bdd0;">${maskPhone(team.phone)}</div>
                            </div>
                            <div class="meta-row" style="color:#97a2b8;">
                              <span>테이블 ${escapeHtml(team.tableNo || "-")}</span>
                              <span>인원 ${team.people || "-"}명</span>
                              <span>포인트 ${team.points || 0}개</span>
                              <span>보드게임 ${team.boardgamePoint || 0}개</span>
                            </div>
                            <div class="grid-gap" style="gap:10px;">
                              <div class="point-buttons" style="gap:8px;">
                                ${[1, 2, 3, 4, 5]
                                  .map(
                                    (n) => `<button class="btn btn-soft" onclick="givePoints('${team.id}', ${n})">+${n}</button>`
                                  )
                                  .join("")}
                                <button class="btn btn-green" style="padding:9px 12px;" onclick="giveBoardgamePoint('${team.id}')">보드게임 1지급</button>
                              </div>
                              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                                <button class="btn btn-direct" onclick="directEditPoints('${team.id}')">일반 포인트 직접수정</button>
                                <button class="btn btn-direct" onclick="directEditBoardgamePoints('${team.id}')">보드게임 포인트 직접수정</button>
                              </div>
                              <button class="btn btn-red" style="padding:10px 12px;" onclick="deleteTeam('${team.id}')">팀 완전삭제</button>
                            </div>
                          </div>
                        `
                          )
                          .join("")
                  }
                </div>
              </div>

              <div class="grid-gap">
                <div class="flex-between" style="align-items:center;">
                  <div class="section-title" style="margin-bottom:0;">관리자용 실시간 대기화면</div>
                  <div class="inline-buttons" style="gap:10px;">
                    <button class="btn btn-gray" onclick="setMode('customer')">고객화면으로</button>
                  </div>
                </div>

                <div class="grid-gap">
                  ${adminQueueCard("big", "큰방1", queueDetails.big)}
                  ${adminQueueCard("small1", "작은방1", queueDetails.small1)}
                  ${adminQueueCard("small2", "작은방2", queueDetails.small2)}
                  ${adminQueueCard(BOARDGAME_KEY, "보드게임 사용자", queueDetails.boardgame)}
                </div>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

function setMode(mode) {
  state.mode = mode;
  render();
}

function setPcTab(tab) {
  state.pcScreenTab = tab;
  render();
}

function updateAdminPassword(value) {
  state.adminPassword = value;
}

function updateSearchKeyword(value) {
  state.searchKeyword = value;
  render();
}

function updateCustomerForm(key, value) {
  state.customerForm[key] = value;
}

window.setMode = setMode;
window.setPcTab = setPcTab;
window.updateAdminPassword = updateAdminPassword;
window.updateSearchKeyword = updateSearchKeyword;
window.updateCustomerForm = updateCustomerForm;
window.handleCustomerLogin = handleCustomerLogin;
window.handleCustomerSaveStep2 = handleCustomerSaveStep2;
window.handleReserve = handleReserve;
window.handleAdminLogin = handleAdminLogin;
window.givePoints = givePoints;
window.giveBoardgamePoint = giveBoardgamePoint;
window.directEditPoints = directEditPoints;
window.directEditBoardgamePoints = directEditBoardgamePoints;
window.removeFromQueue = removeFromQueue;
window.enterTeam = enterTeam;
window.deleteTeam = deleteTeam;
window.resetAll = resetAll;
window.triggerHiddenAdmin = triggerHiddenAdmin;
window.closeHiddenAdmin = closeHiddenAdmin;

onSnapshot(teamsRef, (snapshot) => {
  state.teams = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));

  if (state.currentUserId && !getTeamById(state.currentUserId)) {
    setCurrentUser(null);
  }

  const currentUser = getCurrentUser();
  if (currentUser) {
    state.customerForm.teamName = currentUser.teamName || state.customerForm.teamName;
    state.customerForm.phone = currentUser.phone || state.customerForm.phone;
    state.customerForm.people = currentUser.people || state.customerForm.people;
    state.customerForm.tableNo = currentUser.tableNo || state.customerForm.tableNo;
  } else {
    const matchedByPhone = state.teams.find(
      (team) => onlyNumber(team.phone) && onlyNumber(team.phone) === onlyNumber(state.customerForm.phone)
    );
    if (matchedByPhone) {
      setCurrentUser(matchedByPhone.id);
    }
  }

  state.ready = true;
  render();
});

render();
