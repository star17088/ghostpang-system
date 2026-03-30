import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ghostpang_waiting_data_v2";
const ADMIN_PASSWORD = "1234";

const ROOM_OPTIONS = [
  { key: "big", label: "큰방1", size: "3~6인" },
  { key: "small1", label: "작은방1", size: "2~4인" },
  { key: "small2", label: "작은방2", size: "2~4인" },
];

const BOARDGAME_KEY = "boardgame";

const initialData = {
  users: [],
  queues: {
    big: [],
    small1: [],
    small2: [],
    boardgame: [],
  },
};

function nowText() {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function onlyNumber(value) {
  return value.replace(/[^0-9]/g, "");
}

function maskPhone(phone) {
  const p = onlyNumber(phone);
  if (p.length < 7) return p;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  if (p.length >= 11)
    return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7, 11)}`;
  return p;
}

function getSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialData;
    const parsed = JSON.parse(raw);
    return {
      users: parsed.users || [],
      queues: {
        big: parsed.queues?.big || [],
        small1: parsed.queues?.small1 || [],
        small2: parsed.queues?.small2 || [],
        boardgame: parsed.queues?.boardgame || [],
      },
    };
  } catch (e) {
    return initialData;
  }
}

function App() {
  const [data, setData] = useState(initialData);
  const [mode, setMode] = useState("customer");
  const [pcScreenTab, setPcScreenTab] = useState("rooms");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [customerStep, setCustomerStep] = useState(1);
  const [customerForm, setCustomerForm] = useState({
    teamName: "",
    phone: "",
    people: "",
    tableNo: "",
  });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    setData(getSavedData());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const currentUser = useMemo(
    () => data.users.find((u) => u.id === currentUserId) || null,
    [data.users, currentUserId]
  );

  const boardgameUsers = useMemo(() => {
    return data.queues.boardgame
      .map((id) => data.users.find((u) => u.id === id))
      .filter(Boolean);
  }, [data]);

  const visibleCustomerQueues = useMemo(() => {
    return {
      big: data.queues.big
        .map((id) => data.users.find((u) => u.id === id))
        .filter(Boolean),
      small1: data.queues.small1
        .map((id) => data.users.find((u) => u.id === id))
        .filter(Boolean),
      small2: data.queues.small2
        .map((id) => data.users.find((u) => u.id === id))
        .filter(Boolean),
    };
  }, [data]);

  const adminFilteredUsers = useMemo(() => {
    const keyword = searchKeyword.trim();
    if (!keyword) return data.users;
    return data.users.filter(
      (u) =>
        u.teamName.includes(keyword) ||
        onlyNumber(u.phone).includes(onlyNumber(keyword))
    );
  }, [data.users, searchKeyword]);

  const queueDetailsForAdmin = useMemo(() => {
    const makeList = (queueKey) =>
      data.queues[queueKey]
        .map((id, index) => {
          const user = data.users.find((u) => u.id === id);
          if (!user) return null;
          return {
            ...user,
            waitNo: index + 1,
          };
        })
        .filter(Boolean);

    return {
      big: makeList("big"),
      small1: makeList("small1"),
      small2: makeList("small2"),
      boardgame: makeList("boardgame"),
    };
  }, [data]);

  function updateCustomerForm(key, value) {
    setCustomerForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCustomerLogin() {
    const teamName = customerForm.teamName.trim();
    const phone = onlyNumber(customerForm.phone);

    if (!teamName || !phone) {
      alert("팀이름과 핸드폰번호를 입력해주세요.");
      return;
    }

    let foundUser = data.users.find((u) => onlyNumber(u.phone) === phone);

    if (!foundUser) {
      foundUser = {
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

      setData((prev) => ({
        ...prev,
        users: [...prev.users, foundUser],
      }));
    } else if (foundUser.teamName !== teamName) {
      setData((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === foundUser.id ? { ...u, teamName } : u
        ),
      }));
      foundUser = { ...foundUser, teamName };
    }

    setCurrentUserId(foundUser.id);
    setCustomerStep(2);
  }

  function handleCustomerSaveStep2() {
    if (!currentUser) return;
    const people = customerForm.people.trim();
    const tableNo = customerForm.tableNo.trim();

    if (!people || !tableNo) {
      alert("인원 수와 테이블 번호를 입력해주세요.");
      return;
    }

    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === currentUser.id
          ? {
              ...u,
              people,
              tableNo,
            }
          : u
      ),
    }));
  }

  function isAlreadyInQueue(queueKey, userId) {
    return data.queues[queueKey].includes(userId);
  }

  function handleReserve(queueKey) {
    if (!currentUser) {
      alert("먼저 로그인해주세요.");
      return;
    }

    const latestUser = data.users.find((u) => u.id === currentUser.id);
    if (!latestUser) return;

    if (!latestUser.people || !latestUser.tableNo) {
      alert("인원 수와 테이블 번호를 먼저 입력해주세요.");
      return;
    }

    if (latestUser.points < 1) {
      alert("예약 가능한 포인트가 없습니다.");
      return;
    }

    if (isAlreadyInQueue(queueKey, latestUser.id)) {
      alert("이미 해당 대기열에 등록되어 있습니다.");
      return;
    }

    setData((prev) => ({
      users: prev.users.map((u) =>
        u.id === latestUser.id ? { ...u, points: u.points - 1 } : u
      ),
      queues: {
        ...prev.queues,
        [queueKey]: [...prev.queues[queueKey], latestUser.id],
      },
    }));
  }

  function handleAdminLogin() {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminOpen(true);
    } else {
      alert("관리자 비밀번호가 올바르지 않습니다.");
    }
  }

  function givePoints(userId, amount) {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, points: (u.points || 0) + amount } : u
      ),
    }));
  }

  function giveBoardgamePoint(userId) {
    setData((prev) => {
      const target = prev.users.find((u) => u.id === userId);
      if (!target) return prev;

      const shouldJoinQueue = !prev.queues.boardgame.includes(userId);

      return {
        users: prev.users.map((u) =>
          u.id === userId
            ? {
                ...u,
                boardgamePoint: 1,
                boardgameJoinedAt:
                  u.boardgameJoinedAt ||
                  (shouldJoinQueue ? nowText() : u.boardgameJoinedAt),
              }
            : u
        ),
        queues: {
          ...prev.queues,
          boardgame: shouldJoinQueue
            ? [...prev.queues.boardgame, userId]
            : prev.queues.boardgame,
        },
      };
    });
  }

  function removeFromQueue(queueKey, userId) {
    setData((prev) => ({
      ...prev,
      queues: {
        ...prev.queues,
        [queueKey]: prev.queues[queueKey].filter((id) => id !== userId),
      },
    }));
  }

  function enterTeam(queueKey, userId) {
    setData((prev) => ({
      ...prev,
      queues: {
        ...prev.queues,
        [queueKey]: prev.queues[queueKey].filter((id) => id !== userId),
      },
    }));
  }

  function resetAll() {
    const ok = window.confirm(
      "전체 데이터를 초기화할까요?\n등록 고객, 포인트, 대기열이 모두 삭제됩니다."
    );
    if (!ok) return;
    setData(initialData);
    setCurrentUserId(null);
    setCustomerStep(1);
    setCustomerForm({
      teamName: "",
      phone: "",
      people: "",
      tableNo: "",
    });
  }

  const cardStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
    backdropFilter: "blur(8px)",
  };

  const buttonStyle = {
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid #2f3747",
    background: "#131824",
    color: "white",
    fontSize: 15,
    outline: "none",
  };

  const renderCustomerQueueCard = (room) => {
    const list = visibleCustomerQueues[room.key];

    return (
      <div key={room.key} style={{ ...cardStyle }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{room.label}</div>
            <div style={{ fontSize: 13, color: "#9da7bb", marginTop: 4 }}>
              {room.size}
            </div>
          </div>
          <button
            style={{ ...buttonStyle, background: "#ff8a00", color: "#111" }}
            onClick={() => handleReserve(room.key)}
          >
            예약 등록
          </button>
        </div>

        {list.length === 0 ? (
          <div style={{ color: "#8e97a8", fontSize: 14 }}>현재 대기 없음</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {list.map((user, index) => (
              <div
                key={user.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontWeight: 700 }}>{index + 1}순위</div>
                <div style={{ color: "#ffffff" }}>{user.teamName}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAdminQueueCard = (queueKey, title) => {
    const list = queueDetailsForAdmin[queueKey];
    const isBoardGame = queueKey === BOARDGAME_KEY;

    return (
      <div style={{ ...cardStyle }} key={queueKey}>
        <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 14 }}>
          {title}
        </div>
        {list.length === 0 ? (
          <div style={{ color: "#8e97a8", fontSize: 14 }}>현재 대기 없음</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {list.map((user) => (
              <div
                key={user.id}
                style={{
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  padding: 14,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    {user.waitNo}순위 · {user.teamName}
                  </div>
                  <div style={{ color: "#c7cedb", fontSize: 14 }}>
                    {maskPhone(user.phone)}
                  </div>
                </div>
                {!isBoardGame && (
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      flexWrap: "wrap",
                      color: "#a8b2c5",
                      fontSize: 14,
                    }}
                  >
                    <span>테이블 {user.tableNo || "-"}</span>
                    <span>인원 {user.people || "-"}명</span>
                  </div>
                )}
                {isBoardGame && (
                  <div style={{ color: "#a8b2c5", fontSize: 14 }}>
                    로그인 시간 {user.boardgameJoinedAt || "-"}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    style={{
                      ...buttonStyle,
                      background: "#3ddc97",
                      color: "#111",
                      padding: "10px 14px",
                    }}
                    onClick={() => enterTeam(queueKey, user.id)}
                  >
                    입장
                  </button>
                  <button
                    style={{
                      ...buttonStyle,
                      background: "#ff5c5c",
                      color: "white",
                      padding: "10px 14px",
                    }}
                    onClick={() => removeFromQueue(queueKey, user.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #080b12 0%, #101522 100%)",
        color: "white",
        padding: 20,
        fontFamily: "Pretendard, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.5 }}>
              고스트팡 대기 시스템
            </div>
            <div style={{ color: "#97a2b8", marginTop: 6 }}>
              고객용 / 관리자용 실시간 대기 등록
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={{
                ...buttonStyle,
                background: mode === "customer" ? "#ff8a00" : "#20283a",
                color: mode === "customer" ? "#111" : "white",
              }}
              onClick={() => setMode("customer")}
            >
              고객용 화면
            </button>
            <button
              style={{
                ...buttonStyle,
                background: mode === "admin" ? "#ff8a00" : "#20283a",
                color: mode === "admin" ? "#111" : "white",
              }}
              onClick={() => setMode("admin")}
            >
              관리자용 화면
            </button>
            <button
              style={{
                ...buttonStyle,
                background: mode === "pc" ? "#ff8a00" : "#20283a",
                color: mode === "pc" ? "#111" : "white",
              }}
              onClick={() => setMode("pc")}
            >
              PC용 화면
            </button>
          </div>
        </div>

        {mode === "customer" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.05fr 1.2fr",
              gap: 20,
            }}
          >
            <div style={{ ...cardStyle, alignSelf: "start" }}>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 18 }}>
                고객 로그인 / 정보입력
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div
                    style={{ fontSize: 14, color: "#aab4c7", marginBottom: 8 }}
                  >
                    팀이름
                  </div>
                  <input
                    style={inputStyle}
                    value={customerForm.teamName}
                    onChange={(e) =>
                      updateCustomerForm("teamName", e.target.value)
                    }
                    placeholder="예: 또야팀"
                  />
                </div>

                <div>
                  <div
                    style={{ fontSize: 14, color: "#aab4c7", marginBottom: 8 }}
                  >
                    핸드폰번호
                  </div>
                  <input
                    style={inputStyle}
                    value={customerForm.phone}
                    onChange={(e) =>
                      updateCustomerForm("phone", onlyNumber(e.target.value))
                    }
                    placeholder="숫자만 입력"
                  />
                </div>

                <button
                  style={{
                    ...buttonStyle,
                    background: "#ff8a00",
                    color: "#111",
                    marginTop: 4,
                  }}
                  onClick={handleCustomerLogin}
                >
                  로그인
                </button>
              </div>

              <div
                style={{
                  marginTop: 20,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  paddingTop: 20,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  2단계 정보입력
                </div>
                <div>
                  <div
                    style={{ fontSize: 14, color: "#aab4c7", marginBottom: 8 }}
                  >
                    인원 수
                  </div>
                  <input
                    style={inputStyle}
                    value={customerForm.people}
                    onChange={(e) =>
                      updateCustomerForm("people", onlyNumber(e.target.value))
                    }
                    placeholder="예: 4"
                  />
                </div>
                <div>
                  <div
                    style={{ fontSize: 14, color: "#aab4c7", marginBottom: 8 }}
                  >
                    테이블 번호
                  </div>
                  <input
                    style={inputStyle}
                    value={customerForm.tableNo}
                    onChange={(e) =>
                      updateCustomerForm("tableNo", e.target.value)
                    }
                    placeholder="예: A-3"
                  />
                </div>
                <button
                  style={{
                    ...buttonStyle,
                    background: "#4c7dff",
                    color: "white",
                  }}
                  onClick={handleCustomerSaveStep2}
                >
                  정보 저장
                </button>
              </div>

              {currentUser && (
                <div
                  style={{
                    marginTop: 20,
                    background: "rgba(255,138,0,0.12)",
                    border: "1px solid rgba(255,138,0,0.28)",
                    borderRadius: 16,
                    padding: 16,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {currentUser.teamName}
                  </div>
                  <div style={{ color: "#ffd7a6" }}>
                    예약 가능 포인트: {currentUser.points || 0}개
                  </div>
                  <div style={{ color: "#ffd7a6" }}>
                    보드게임 포인트: {currentUser.boardgamePoint || 0}개
                  </div>
                  {(currentUser.people || currentUser.tableNo) && (
                    <div style={{ color: "#ffd7a6" }}>
                      인원 {currentUser.people || "-"}명 · 테이블{" "}
                      {currentUser.tableNo || "-"}
                    </div>
                  )}
                </div>
              )}

              {boardgameUsers.some((u) => u.id === currentUserId) && (
                <div
                  style={{
                    marginTop: 16,
                    background: "rgba(61,220,151,0.12)",
                    border: "1px solid rgba(61,220,151,0.3)",
                    borderRadius: 16,
                    padding: 16,
                    color: "#bdf6da",
                    fontWeight: 700,
                  }}
                >
                  보드게임 사용자로 자동 등록되었습니다.
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                실시간 대기화면
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                {ROOM_OPTIONS.map(renderCustomerQueueCard)}
              </div>
            </div>
          </div>
        )}

        {mode === "pc" && (
          <div style={{ display: "grid", gap: 22 }}>
            <div
              style={{
                ...cardStyle,
                padding: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 28, fontWeight: 900 }}>
                  고스트팡 실시간 대기 현황
                </div>
                <div style={{ color: "#a8b2c5", marginTop: 6, fontSize: 15 }}>
                  PC 또는 TV 전체화면용 안내 화면
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  style={{
                    ...buttonStyle,
                    background: pcScreenTab === "rooms" ? "#ff8a00" : "#20283a",
                    color: pcScreenTab === "rooms" ? "#111" : "white",
                  }}
                  onClick={() => setPcScreenTab("rooms")}
                >
                  게임방 대기
                </button>
                <button
                  style={{
                    ...buttonStyle,
                    background:
                      pcScreenTab === "boardgame" ? "#ff8a00" : "#20283a",
                    color: pcScreenTab === "boardgame" ? "#111" : "white",
                  }}
                  onClick={() => setPcScreenTab("boardgame")}
                >
                  보드게임 사용자
                </button>
              </div>
            </div>

            {pcScreenTab === "rooms" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 18,
                }}
              >
                {ROOM_OPTIONS.map((room) => {
                  const list = visibleCustomerQueues[room.key];
                  return (
                    <div
                      key={room.key}
                      style={{
                        ...cardStyle,
                        minHeight: 520,
                        padding: 24,
                        display: "grid",
                        alignContent: "start",
                        gap: 16,
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 30, fontWeight: 900 }}>
                          {room.label}
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#97a2b8",
                            marginTop: 6,
                          }}
                        >
                          {room.size}
                        </div>
                      </div>

                      {list.length === 0 ? (
                        <div
                          style={{
                            height: "100%",
                            display: "grid",
                            placeItems: "center",
                            color: "#8e97a8",
                            fontSize: 24,
                            fontWeight: 700,
                          }}
                        >
                          현재 대기 없음
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 14 }}>
                          {list.map((user, index) => (
                            <div
                              key={user.id}
                              style={{
                                borderRadius: 18,
                                background:
                                  index === 0
                                    ? "rgba(255,138,0,0.16)"
                                    : "rgba(255,255,255,0.05)",
                                border:
                                  index === 0
                                    ? "1px solid rgba(255,138,0,0.35)"
                                    : "1px solid rgba(255,255,255,0.05)",
                                padding: "18px 20px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 16,
                              }}
                            >
                              <div style={{ fontSize: 24, fontWeight: 900 }}>
                                {index + 1} 순위
                              </div>
                              <div style={{ fontSize: 24, fontWeight: 800 }}>
                                {user.teamName}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {pcScreenTab === "boardgame" && (
              <div style={{ ...cardStyle, padding: 28 }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 32, fontWeight: 900 }}>
                    보드게임 사용자
                  </div>
                  <div style={{ color: "#9ca8bc", marginTop: 6, fontSize: 16 }}>
                    고객용 화면에는 팀이름과 로그인 시간만 표시됩니다.
                  </div>
                </div>

                {boardgameUsers.length === 0 ? (
                  <div
                    style={{
                      minHeight: 420,
                      display: "grid",
                      placeItems: "center",
                      color: "#8e97a8",
                      fontSize: 28,
                      fontWeight: 700,
                    }}
                  >
                    현재 보드게임 사용자 없음
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 16,
                    }}
                  >
                    {boardgameUsers.map((user, index) => (
                      <div
                        key={user.id}
                        style={{
                          borderRadius: 18,
                          background: "rgba(255,255,255,0.05)",
                          padding: 20,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ fontSize: 24, fontWeight: 900 }}>
                          {index + 1} 순서
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 800 }}>
                          {user.teamName}
                        </div>
                        <div style={{ color: "#a7b1c4", fontSize: 16 }}>
                          로그인 시간 {user.boardgameJoinedAt || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "admin" && (
          <div style={{ display: "grid", gap: 20 }}>
            {!adminOpen ? (
              <div style={{ ...cardStyle, maxWidth: 480 }}>
                <div
                  style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}
                >
                  관리자 로그인
                </div>
                <input
                  style={inputStyle}
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="관리자 비밀번호 입력"
                />
                <button
                  style={{
                    ...buttonStyle,
                    background: "#ff8a00",
                    color: "#111",
                    marginTop: 14,
                    width: "100%",
                  }}
                  onClick={handleAdminLogin}
                >
                  로그인
                </button>
                <div style={{ color: "#8f98aa", fontSize: 13, marginTop: 10 }}>
                  기본 비밀번호: 1234 (원하시면 나중에 변경 가능)
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.05fr 1.2fr",
                    gap: 20,
                  }}
                >
                  <div style={{ ...cardStyle, alignSelf: "start" }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        marginBottom: 14,
                      }}
                    >
                      고객 검색 / 포인트 지급
                    </div>
                    <input
                      style={inputStyle}
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="팀명 또는 핸드폰번호 검색"
                    />

                    <div
                      style={{
                        marginTop: 16,
                        display: "grid",
                        gap: 10,
                        maxHeight: 640,
                        overflowY: "auto",
                      }}
                    >
                      {adminFilteredUsers.length === 0 ? (
                        <div style={{ color: "#8e97a8" }}>
                          검색 결과가 없습니다.
                        </div>
                      ) : (
                        adminFilteredUsers.map((user) => (
                          <div
                            key={user.id}
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              borderRadius: 14,
                              padding: 14,
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ fontWeight: 800 }}>
                                {user.teamName}
                              </div>
                              <div style={{ color: "#b3bdd0" }}>
                                {maskPhone(user.phone)}
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                flexWrap: "wrap",
                                color: "#97a2b8",
                                fontSize: 14,
                              }}
                            >
                              <span>테이블 {user.tableNo || "-"}</span>
                              <span>인원 {user.people || "-"}명</span>
                              <span>포인트 {user.points || 0}개</span>
                              <span>보드게임 {user.boardgamePoint || 0}개</span>
                            </div>
                            <div style={{ display: "grid", gap: 10 }}>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <button
                                    key={n}
                                    style={{
                                      ...buttonStyle,
                                      background: "#24324d",
                                      color: "white",
                                      padding: "9px 12px",
                                    }}
                                    onClick={() => givePoints(user.id, n)}
                                  >
                                    +{n}
                                  </button>
                                ))}
                                <button
                                  style={{
                                    ...buttonStyle,
                                    background: "#3ddc97",
                                    color: "#111",
                                    padding: "9px 12px",
                                  }}
                                  onClick={() => giveBoardgamePoint(user.id)}
                                >
                                  보드게임 1지급
                                </button>
                              </div>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: 8,
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  style={{
                                    ...buttonStyle,
                                    background: "#5b6380",
                                    color: "white",
                                    padding: "10px 12px",
                                  }}
                                  onClick={() => {
                                    const value = window.prompt(
                                      "변경할 일반 포인트 값을 입력해주세요.",
                                      String(user.points || 0)
                                    );
                                    if (value === null) return;
                                    const num = Number(value);
                                    if (Number.isNaN(num) || num < 0) {
                                      alert("0 이상의 숫자만 입력해주세요.");
                                      return;
                                    }
                                    setData((prev) => ({
                                      ...prev,
                                      users: prev.users.map((u) =>
                                        u.id === user.id
                                          ? { ...u, points: Math.floor(num) }
                                          : u
                                      ),
                                    }));
                                  }}
                                >
                                  일반 포인트 직접수정
                                </button>

                                <button
                                  style={{
                                    ...buttonStyle,
                                    background: "#5b6380",
                                    color: "white",
                                    padding: "10px 12px",
                                  }}
                                  onClick={() => {
                                    const value = window.prompt(
                                      "변경할 보드게임 포인트 값을 입력해주세요. (0 또는 1 권장)",
                                      String(user.boardgamePoint || 0)
                                    );
                                    if (value === null) return;
                                    const num = Number(value);
                                    if (Number.isNaN(num) || num < 0) {
                                      alert("0 이상의 숫자만 입력해주세요.");
                                      return;
                                    }

                                    const nextValue = Math.floor(num);
                                    setData((prev) => {
                                      const alreadyInQueue =
                                        prev.queues.boardgame.includes(user.id);
                                      const shouldAddQueue =
                                        nextValue >= 1 && !alreadyInQueue;
                                      const shouldRemoveQueue =
                                        nextValue < 1 && alreadyInQueue;

                                      return {
                                        users: prev.users.map((u) =>
                                          u.id === user.id
                                            ? {
                                                ...u,
                                                boardgamePoint: nextValue,
                                                boardgameJoinedAt:
                                                  nextValue >= 1
                                                    ? u.boardgameJoinedAt ||
                                                      nowText()
                                                    : "",
                                              }
                                            : u
                                        ),
                                        queues: {
                                          ...prev.queues,
                                          boardgame: shouldAddQueue
                                            ? [
                                                ...prev.queues.boardgame,
                                                user.id,
                                              ]
                                            : shouldRemoveQueue
                                            ? prev.queues.boardgame.filter(
                                                (id) => id !== user.id
                                              )
                                            : prev.queues.boardgame,
                                        },
                                      };
                                    });
                                  }}
                                >
                                  보드게임 포인트 직접수정
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontSize: 22, fontWeight: 900 }}>
                        관리자용 실시간 대기화면
                      </div>
                      <button
                        style={{
                          ...buttonStyle,
                          background: "#5d667a",
                          color: "white",
                        }}
                        onClick={resetAll}
                      >
                        전체 초기화
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: 16 }}>
                      {renderAdminQueueCard("big", "큰방1")}
                      {renderAdminQueueCard("small1", "작은방1")}
                      {renderAdminQueueCard("small2", "작은방2")}
                      {renderAdminQueueCard("boardgame", "보드게임 사용자")}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
