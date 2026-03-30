import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ghostpang_waiting_data_v_final";

export default function App() {
  const [page, setPage] = useState("entry"); // entry | customer-select | boardgame-form | admin
  const [customerInfo, setCustomerInfo] = useState({
    teamName: "",
    phone: "",
  });

  const [loginTeamName, setLoginTeamName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [boardgameForm, setBoardgameForm] = useState({
    people: "",
    tableNumber: "",
  });

  const [queues, setQueues] = useState({
    bigRoom: [],
    smallRoom1: [],
    smallRoom2: [],
    boardgame: [],
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (parsed?.queues) {
        setQueues(parsed.queues);
      }
    } catch (e) {
      console.error("저장 데이터 불러오기 실패:", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        queues,
      })
    );
  }, [queues]);

  const counts = useMemo(() => {
    return {
      bigRoom: queues.bigRoom.length,
      smallRoom1: queues.smallRoom1.length,
      smallRoom2: queues.smallRoom2.length,
      boardgame: queues.boardgame.length,
    };
  }, [queues]);

  const getNowString = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  const resetCustomerFlow = () => {
    setCustomerInfo({ teamName: "", phone: "" });
    setLoginTeamName("");
    setLoginPhone("");
    setBoardgameForm({ people: "", tableNumber: "" });
    setPage("entry");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCustomerLogin = () => {
    if (!loginTeamName.trim()) {
      alert("팀이름을 입력해주세요.");
      return;
    }

    if (!loginPhone.trim()) {
      alert("전화번호를 입력해주세요.");
      return;
    }

    setCustomerInfo({
      teamName: loginTeamName.trim(),
      phone: loginPhone.trim(),
    });

    setPage("customer-select");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdminLogin = () => {
    if (adminPassword !== "0702") {
      alert("비밀번호가 올바르지 않습니다.");
      return;
    }

    setAdminPassword("");
    setPage("admin");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addQueueItem = (type, extra = {}) => {
    const newItem = {
      id: Date.now() + Math.random(),
      teamName: customerInfo.teamName,
      phone: customerInfo.phone,
      createdAt: getNowString(),
      ...extra,
    };

    setQueues((prev) => ({
      ...prev,
      [type]: [...prev[type], newItem],
    }));
  };

  const handleRegisterRoom = (type) => {
    addQueueItem(type);
    alert("대기 등록이 완료되었습니다.");
    resetCustomerFlow();
  };

  const handleRegisterBoardgame = () => {
    if (!boardgameForm.people.trim()) {
      alert("인원수를 입력해주세요.");
      return;
    }

    if (!boardgameForm.tableNumber.trim()) {
      alert("테이블 번호를 입력해주세요.");
      return;
    }

    addQueueItem("boardgame", {
      people: boardgameForm.people.trim(),
      tableNumber: boardgameForm.tableNumber.trim(),
    });

    alert("보드게임 대기 등록이 완료되었습니다.");
    resetCustomerFlow();
  };

  const handleEnterRoom = (type, id) => {
    const target = queues[type].find((item) => item.id === id);
    if (!target) return;

    const ok = window.confirm(
      `${target.teamName} 팀을 입장 처리하시겠습니까?`
    );
    if (!ok) return;

    setQueues((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => item.id !== id),
    }));
  };

  const handleDelete = (type, id) => {
    const ok = window.confirm("이 대기팀을 삭제하시겠습니까?");
    if (!ok) return;

    setQueues((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => item.id !== id),
    }));
  };

  const handleResetAll = () => {
    const ok = window.confirm("전체 대기열을 모두 초기화하시겠습니까?");
    if (!ok) return;

    setQueues({
      bigRoom: [],
      smallRoom1: [],
      smallRoom2: [],
      boardgame: [],
    });
  };

  const handleResetOneQueue = (typeLabel, type) => {
    const ok = window.confirm(`${typeLabel} 대기열을 전체 초기화하시겠습니까?`);
    if (!ok) return;

    setQueues((prev) => ({
      ...prev,
      [type]: [],
    }));
  };

  const renderEntryPage = () => {
    return (
      <div style={styles.page}>
        <section style={styles.heroSection}>
          <div style={styles.mainCard}>
            <div style={styles.logoBox}>
              <div style={styles.logoText}>GHOSTPANG</div>
              <div style={styles.logoSub}>대기 등록 시스템</div>
            </div>

            <h1 style={styles.mainTitle}>고객 로그인</h1>
            <p style={styles.mainDesc}>
              팀이름과 전화번호를 입력하신 뒤 로그인 해주세요.
            </p>

            <input
              style={styles.input}
              type="text"
              placeholder="팀이름"
              value={loginTeamName}
              onChange={(e) => setLoginTeamName(e.target.value)}
            />

            <input
              style={styles.input}
              type="tel"
              placeholder="전화번호"
              value={loginPhone}
              onChange={(e) => setLoginPhone(e.target.value)}
            />

            <button style={styles.primaryButton} onClick={handleCustomerLogin}>
              로그인
            </button>
          </div>
        </section>

        <div style={styles.longSpacer}>
          <div style={styles.scrollHint}>아래로 스크롤</div>
        </div>

        <section style={styles.adminArea}>
          <div style={styles.adminHiddenCard}>
            <input
              style={styles.adminInput}
              type="password"
              placeholder="관리자 비밀번호"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <button style={styles.adminLoginButton} onClick={handleAdminLogin}>
              관리자 로그인
            </button>
          </div>
        </section>
      </div>
    );
  };

  const renderCustomerSelectPage = () => {
    return (
      <div style={styles.page}>
        <div style={styles.contentWrap}>
          <div style={styles.topCard}>
            <div style={styles.customerWelcome}>
              <div style={styles.customerName}>{customerInfo.teamName} 팀</div>
              <div style={styles.customerPhone}>{customerInfo.phone}</div>
            </div>

            <h2 style={styles.sectionTitle}>원하시는 대기 항목을 선택해주세요</h2>

            <div style={styles.roomGrid}>
              <button
                style={styles.roomButton}
                onClick={() => handleRegisterRoom("bigRoom")}
              >
                <div style={styles.roomButtonTitle}>큰방</div>
                <div style={styles.roomButtonSub}>
                  현재 대기 {counts.bigRoom}팀
                </div>
              </button>

              <button
                style={styles.roomButton}
                onClick={() => handleRegisterRoom("smallRoom1")}
              >
                <div style={styles.roomButtonTitle}>작은방1</div>
                <div style={styles.roomButtonSub}>
                  현재 대기 {counts.smallRoom1}팀
                </div>
              </button>

              <button
                style={styles.roomButton}
                onClick={() => handleRegisterRoom("smallRoom2")}
              >
                <div style={styles.roomButtonTitle}>작은방2</div>
                <div style={styles.roomButtonSub}>
                  현재 대기 {counts.smallRoom2}팀
                </div>
              </button>

              <button
                style={styles.roomButton}
                onClick={() => setPage("boardgame-form")}
              >
                <div style={styles.roomButtonTitle}>보드게임</div>
                <div style={styles.roomButtonSub}>
                  현재 대기 {counts.boardgame}팀
                </div>
              </button>
            </div>

            <button style={styles.secondaryButton} onClick={resetCustomerFlow}>
              처음으로
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderBoardgameFormPage = () => {
    return (
      <div style={styles.page}>
        <div style={styles.contentWrap}>
          <div style={styles.topCard}>
            <h2 style={styles.sectionTitle}>보드게임 대기 등록</h2>

            <div style={styles.infoCard}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>팀이름</span>
                <span style={styles.infoValue}>{customerInfo.teamName}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>전화번호</span>
                <span style={styles.infoValue}>{customerInfo.phone}</span>
              </div>
            </div>

            <input
              style={styles.input}
              type="number"
              placeholder="인원수"
              value={boardgameForm.people}
              onChange={(e) =>
                setBoardgameForm((prev) => ({
                  ...prev,
                  people: e.target.value,
                }))
              }
            />

            <input
              style={styles.input}
              type="text"
              placeholder="테이블 번호"
              value={boardgameForm.tableNumber}
              onChange={(e) =>
                setBoardgameForm((prev) => ({
                  ...prev,
                  tableNumber: e.target.value,
                }))
              }
            />

            <button
              style={styles.primaryButton}
              onClick={handleRegisterBoardgame}
            >
              대기 등록 완료
            </button>

            <button
              style={styles.secondaryButton}
              onClick={() => setPage("customer-select")}
            >
              이전으로
            </button>
          </div>
        </div>
      </div>
    );
  };

  const QueueSection = ({
    title,
    type,
    list,
    showEnterButton = true,
    isBoardgame = false,
  }) => {
    return (
      <div style={styles.adminSectionCard}>
        <div style={styles.adminSectionHeader}>
          <div>
            <div style={styles.adminSectionTitle}>{title}</div>
            <div style={styles.adminSectionCount}>총 {list.length}팀</div>
          </div>

          <button
            style={styles.resetSmallButton}
            onClick={() => handleResetOneQueue(title, type)}
          >
            전체 삭제
          </button>
        </div>

        {list.length === 0 ? (
          <div style={styles.emptyBox}>현재 대기팀이 없습니다.</div>
        ) : (
          <div style={styles.queueList}>
            {list.map((item, index) => (
              <div key={item.id} style={styles.queueItem}>
                <div style={styles.queueLeft}>
                  <div style={styles.queueOrder}>{index + 1}</div>

                  <div style={styles.queueInfo}>
                    <div style={styles.queueTeamName}>{item.teamName}</div>
                    <div style={styles.queuePhone}>{item.phone}</div>

                    {isBoardgame && (
                      <div style={styles.queueMeta}>
                        인원수 {item.people}명 · 테이블 {item.tableNumber}
                      </div>
                    )}

                    <div style={styles.queueTime}>{item.createdAt}</div>
                  </div>
                </div>

                <div style={styles.queueButtons}>
                  {showEnterButton && (
                    <button
                      style={styles.enterButton}
                      onClick={() => handleEnterRoom(type, item.id)}
                    >
                      입장
                    </button>
                  )}

                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(type, item.id)}
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

  const renderAdminPage = () => {
    return (
      <div style={styles.adminPage}>
        <div style={styles.adminTopBar}>
          <div>
            <div style={styles.adminMainTitle}>고스트팡 관리자</div>
            <div style={styles.adminSubTitle}>대기 현황 관리</div>
          </div>

          <div style={styles.adminTopButtons}>
            <button style={styles.homeButton} onClick={resetCustomerFlow}>
              고객 화면
            </button>
          </div>
        </div>

        <div style={styles.adminSummaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>큰방</div>
            <div style={styles.summaryNumber}>{counts.bigRoom}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>작은방1</div>
            <div style={styles.summaryNumber}>{counts.smallRoom1}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>작은방2</div>
            <div style={styles.summaryNumber}>{counts.smallRoom2}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>보드게임</div>
            <div style={styles.summaryNumber}>{counts.boardgame}</div>
          </div>
        </div>

        <div style={styles.adminContent}>
          <QueueSection
            title="큰방 대기줄"
            type="bigRoom"
            list={queues.bigRoom}
            showEnterButton={true}
          />

          <QueueSection
            title="작은방1 대기줄"
            type="smallRoom1"
            list={queues.smallRoom1}
            showEnterButton={true}
          />

          <QueueSection
            title="작은방2 대기줄"
            type="smallRoom2"
            list={queues.smallRoom2}
            showEnterButton={true}
          />

          <QueueSection
            title="보드게임 대기줄"
            type="boardgame"
            list={queues.boardgame}
            showEnterButton={false}
            isBoardgame={true}
          />
        </div>

        <div style={styles.bottomDangerZone}>
          <button style={styles.resetAllButton} onClick={handleResetAll}>
            전체 초기화
          </button>
        </div>
      </div>
    );
  };

  if (page === "entry") return renderEntryPage();
  if (page === "customer-select") return renderCustomerSelectPage();
  if (page === "boardgame-form") return renderBoardgameFormPage();
  if (page === "admin") return renderAdminPage();

  return null;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000",
    color: "#fff",
  },

  heroSection: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },

  mainCard: {
    width: "100%",
    maxWidth: "460px",
    background: "#111",
    border: "1px solid #222",
    borderRadius: "24px",
    padding: "32px 24px",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  },

  logoBox: {
    textAlign: "center",
    marginBottom: "24px",
  },

  logoText: {
    fontSize: "28px",
    fontWeight: "900",
    color: "#ff7a00",
    letterSpacing: "1px",
  },

  logoSub: {
    fontSize: "13px",
    color: "#aaa",
    marginTop: "6px",
  },

  mainTitle: {
    fontSize: "24px",
    fontWeight: "800",
    textAlign: "center",
    margin: "0 0 10px",
  },

  mainDesc: {
    fontSize: "14px",
    color: "#c6c6c6",
    textAlign: "center",
    margin: "0 0 22px",
    lineHeight: 1.5,
  },

  input: {
    width: "100%",
    height: "54px",
    borderRadius: "12px",
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#fff",
    padding: "0 16px",
    fontSize: "16px",
    outline: "none",
    marginBottom: "14px",
  },

  primaryButton: {
    width: "100%",
    height: "56px",
    border: "none",
    borderRadius: "12px",
    background: "#ff7a00",
    color: "#fff",
    fontSize: "17px",
    fontWeight: "800",
    cursor: "pointer",
    marginTop: "4px",
  },

  secondaryButton: {
    width: "100%",
    height: "50px",
    border: "1px solid #333",
    borderRadius: "12px",
    background: "#151515",
    color: "#ddd",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "12px",
  },

  longSpacer: {
    height: "75vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  scrollHint: {
    color: "#444",
    fontSize: "12px",
    letterSpacing: "1px",
  },

  adminArea: {
    minHeight: "55vh",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: "24px",
  },

  adminHiddenCard: {
    width: "100%",
    maxWidth: "340px",
    background: "#0d0d0d",
    border: "1px solid #1d1d1d",
    borderRadius: "18px",
    padding: "18px",
    opacity: 0.95,
  },

  adminInput: {
    width: "100%",
    height: "46px",
    borderRadius: "10px",
    border: "1px solid #2a2a2a",
    background: "#161616",
    color: "#fff",
    padding: "0 14px",
    fontSize: "14px",
    outline: "none",
    marginBottom: "10px",
  },

  adminLoginButton: {
    width: "100%",
    height: "46px",
    borderRadius: "10px",
    border: "1px solid #2c2c2c",
    background: "#1a1a1a",
    color: "#d9d9d9",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  contentWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },

  topCard: {
    width: "100%",
    maxWidth: "520px",
    background: "#111",
    border: "1px solid #222",
    borderRadius: "24px",
    padding: "28px 22px",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  },

  customerWelcome: {
    background: "#171717",
    border: "1px solid #262626",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "20px",
    textAlign: "center",
  },

  customerName: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#ff7a00",
  },

  customerPhone: {
    fontSize: "14px",
    color: "#bbb",
    marginTop: "6px",
  },

  sectionTitle: {
    fontSize: "22px",
    fontWeight: "800",
    margin: "0 0 18px",
    textAlign: "center",
  },

  roomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },

  roomButton: {
    border: "1px solid #2d2d2d",
    background: "#181818",
    borderRadius: "16px",
    padding: "22px 14px",
    color: "#fff",
    cursor: "pointer",
    minHeight: "120px",
  },

  roomButtonTitle: {
    fontSize: "21px",
    fontWeight: "800",
    marginBottom: "10px",
  },

  roomButtonSub: {
    fontSize: "13px",
    color: "#bcbcbc",
  },

  infoCard: {
    background: "#171717",
    border: "1px solid #262626",
    borderRadius: "16px",
    padding: "14px",
    marginBottom: "18px",
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    padding: "8px 0",
    borderBottom: "1px solid #242424",
  },

  infoLabel: {
    color: "#aaa",
    fontSize: "14px",
  },

  infoValue: {
    color: "#fff",
    fontSize: "14px",
    fontWeight: "700",
  },

  adminPage: {
    minHeight: "100vh",
    background: "#060606",
    color: "#fff",
    padding: "18px",
  },

  adminTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },

  adminMainTitle: {
    fontSize: "28px",
    fontWeight: "900",
    color: "#ff7a00",
  },

  adminSubTitle: {
    fontSize: "13px",
    color: "#aaa",
    marginTop: "4px",
  },

  adminTopButtons: {
    display: "flex",
    gap: "10px",
  },

  homeButton: {
    height: "44px",
    padding: "0 16px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#151515",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
  },

  adminSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "18px",
  },

  summaryCard: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "18px",
    textAlign: "center",
  },

  summaryLabel: {
    fontSize: "14px",
    color: "#bbb",
    marginBottom: "8px",
  },

  summaryNumber: {
    fontSize: "28px",
    fontWeight: "900",
    color: "#ff7a00",
  },

  adminContent: {
    display: "grid",
    gap: "16px",
  },

  adminSectionCard: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "18px",
    padding: "16px",
  },

  adminSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },

  adminSectionTitle: {
    fontSize: "20px",
    fontWeight: "800",
  },

  adminSectionCount: {
    fontSize: "13px",
    color: "#aaa",
    marginTop: "4px",
  },

  resetSmallButton: {
    height: "38px",
    padding: "0 14px",
    borderRadius: "10px",
    border: "1px solid #303030",
    background: "#181818",
    color: "#ddd",
    fontWeight: "700",
    cursor: "pointer",
  },

  emptyBox: {
    borderRadius: "14px",
    border: "1px dashed #2c2c2c",
    padding: "18px",
    color: "#888",
    textAlign: "center",
    background: "#0d0d0d",
  },

  queueList: {
    display: "grid",
    gap: "10px",
  },

  queueItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    padding: "14px",
    borderRadius: "14px",
    background: "#171717",
    border: "1px solid #262626",
    flexWrap: "wrap",
  },

  queueLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    flex: 1,
    minWidth: "240px",
  },

  queueOrder: {
    width: "34px",
    height: "34px",
    borderRadius: "999px",
    background: "#ff7a00",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    flexShrink: 0,
  },

  queueInfo: {
    flex: 1,
  },

  queueTeamName: {
    fontSize: "18px",
    fontWeight: "800",
    marginBottom: "4px",
  },

  queuePhone: {
    fontSize: "14px",
    color: "#cfcfcf",
    marginBottom: "4px",
  },

  queueMeta: {
    fontSize: "13px",
    color: "#ffb36c",
    marginBottom: "4px",
  },

  queueTime: {
    fontSize: "12px",
    color: "#8f8f8f",
  },

  queueButtons: {
    display: "flex",
    gap: "8px",
    marginLeft: "auto",
  },

  enterButton: {
    height: "40px",
    padding: "0 14px",
    borderRadius: "10px",
    border: "none",
    background: "#ff7a00",
    color: "#fff",
    fontWeight: "800",
    cursor: "pointer",
  },

  deleteButton: {
    height: "40px",
    padding: "0 14px",
    borderRadius: "10px",
    border: "1px solid #353535",
    background: "#1a1a1a",
    color: "#e5e5e5",
    fontWeight: "800",
    cursor: "pointer",
  },

  bottomDangerZone: {
    marginTop: "28px",
    paddingTop: "28px",
    display: "flex",
    justifyContent: "center",
  },

  resetAllButton: {
    height: "46px",
    padding: "0 20px",
    borderRadius: "12px",
    border: "1px solid #402020",
    background: "#1a1010",
    color: "#ffb5b5",
    fontWeight: "800",
    cursor: "pointer",
  },
};
