import React, { useEffect, useMemo, useState } from "react";
import "./style.css";

const STORAGE_KEY = "ghostpang_waiting_data_v3";

const DEFAULT_LOGO =
  "https://chat.openai.com/backend-api/placeholder-logo.png";

const initialState = {
  logo: "",
  waitingList: [],
  currentNumber: null,
  calledList: [],
  settings: {
    storeName: "고스트팡",
    playMinutes: 15,
    roomCount: 3
  }
};

function getSavedData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState;
    const parsed = JSON.parse(saved);
    return {
      ...initialState,
      ...parsed,
      settings: {
        ...initialState.settings,
        ...(parsed.settings || {})
      },
      waitingList: parsed.waitingList || [],
      calledList: parsed.calledList || []
    };
  } catch (e) {
    return initialState;
  }
}

function App() {
  const [data, setData] = useState(getSavedData());
  const [mode, setMode] = useState("customer"); // customer | admin
  const [name, setName] = useState("");
  const [people, setPeople] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [logoInput, setLogoInput] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    setLogoInput(data.logo || "");
  }, [data.logo]);

  const nextWaitingNumber = useMemo(() => {
    const allNumbers = [...data.waitingList, ...data.calledList]
      .map((item) => item.number)
      .filter(Boolean);

    if (allNumbers.length === 0) return 1;
    return Math.max(...allNumbers) + 1;
  }, [data.waitingList, data.calledList]);

  const waitingCount = data.waitingList.length;

  const estimatedTeamsBefore = waitingCount;
  const estimatedMinutes = estimatedTeamsBefore * data.settings.playMinutes;

  const handleAddWaiting = () => {
    if (!name.trim()) {
      alert("대표자명을 입력해주세요.");
      return;
    }
    if (!people || Number(people) <= 0) {
      alert("인원수를 입력해주세요.");
      return;
    }
    if (!tableNumber.trim()) {
      alert("테이블번호를 입력해주세요.");
      return;
    }

    const newItem = {
      id: Date.now(),
      number: nextWaitingNumber,
      name: name.trim(),
      people: Number(people),
      tableNumber: tableNumber.trim(),
      phone: phone.trim(),
      createdAt: new Date().toLocaleString("ko-KR"),
      status: "waiting"
    };

    setData((prev) => ({
      ...prev,
      waitingList: [...prev.waitingList, newItem]
    }));

    alert(
      `${newItem.number}번 등록 완료\n대표자명: ${newItem.name}\n인원: ${newItem.people}명\n테이블번호: ${newItem.tableNumber}`
    );

    setName("");
    setPeople("");
    setTableNumber("");
    setPhone("");
  };

  const handleCallNext = () => {
    if (data.waitingList.length === 0) {
      alert("현재 대기팀이 없습니다.");
      return;
    }

    const next = data.waitingList[0];
    const updatedNext = {
      ...next,
      status: "called",
      calledAt: new Date().toLocaleString("ko-KR")
    };

    setData((prev) => ({
      ...prev,
      currentNumber: updatedNext.number,
      waitingList: prev.waitingList.slice(1),
      calledList: [updatedNext, ...prev.calledList]
    }));
  };

  const handleCancelWaiting = (id) => {
    if (!window.confirm("이 대기를 삭제하시겠습니까?")) return;

    setData((prev) => ({
      ...prev,
      waitingList: prev.waitingList.filter((item) => item.id !== id)
    }));
  };

  const handleRemoveCalled = (id) => {
    if (!window.confirm("호출 완료 목록에서 삭제하시겠습니까?")) return;

    setData((prev) => ({
      ...prev,
      calledList: prev.calledList.filter((item) => item.id !== id)
    }));
  };

  const handleResetAll = () => {
    if (
      !window.confirm(
        "전체 대기 목록과 호출 목록을 모두 삭제할까요?\n이 작업은 되돌릴 수 없습니다."
      )
    )
      return;

    setData((prev) => ({
      ...prev,
      waitingList: [],
      calledList: [],
      currentNumber: null
    }));
  };

  const handleLogoSave = () => {
    setData((prev) => ({
      ...prev,
      logo: logoInput.trim()
    }));
    alert("로고가 저장되었습니다.");
  };

  const handleRemoveLogo = () => {
    setLogoInput("");
    setData((prev) => ({
      ...prev,
      logo: ""
    }));
  };

  const handleStoreNameChange = (value) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        storeName: value
      }
    }));
  };

  const handlePlayMinutesChange = (value) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        playMinutes: Number(value) || 15
      }
    }));
  };

  const handleRoomCountChange = (value) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        roomCount: Number(value) || 3
      }
    }));
  };

  const logoSrc = data.logo || DEFAULT_LOGO;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <img
            src={logoSrc}
            alt="고스트팡 로고"
            className="brand-logo"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div>
            <h1>{data.settings.storeName} 대기 시스템</h1>
            <p>고객용 / 관리자용 한 화면에서 사용 가능</p>
          </div>
        </div>

        <div className="mode-switch">
          <button
            className={mode === "customer" ? "active" : ""}
            onClick={() => setMode("customer")}
          >
            고객용 화면
          </button>
          <button
            className={mode === "admin" ? "active" : ""}
            onClick={() => setMode("admin")}
          >
            관리자용 화면
          </button>
        </div>
      </header>

      {mode === "customer" ? (
        <div className="page customer-page">
          <section className="hero-card">
            <img
              src={logoSrc}
              alt="고스트팡"
              className="hero-logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <h2>{data.settings.storeName} 입장 대기 등록</h2>
            <p>
              인원수와 테이블번호를 입력하고 대기를 등록해주세요.
              <br />
              호출 시 관리자 화면에서 순서대로 안내됩니다.
            </p>
          </section>

          <section className="form-card">
            <div className="form-grid">
              <div className="input-group">
                <label>대표자명</label>
                <input
                  type="text"
                  placeholder="예: 김또야"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>인원수</label>
                <input
                  type="number"
                  min="1"
                  placeholder="예: 3"
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>테이블번호</label>
                <input
                  type="text"
                  placeholder="예: A-01"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>연락처(선택)</label>
                <input
                  type="text"
                  placeholder="예: 010-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <button className="primary-btn big-btn" onClick={handleAddWaiting}>
              대기 등록하기
            </button>
          </section>

          <section className="status-wrap">
            <div className="status-card highlight">
              <span>현재 호출 번호</span>
              <strong>
                {data.currentNumber ? `${data.currentNumber}번` : "대기중"}
              </strong>
            </div>

            <div className="status-card">
              <span>현재 대기팀</span>
              <strong>{waitingCount}팀</strong>
            </div>

            <div className="status-card">
              <span>예상 대기시간</span>
              <strong>{estimatedMinutes}분</strong>
            </div>
          </section>

          <section className="customer-note">
            <h3>안내사항</h3>
            <ul>
              <li>호출 순서에 맞춰 관리자 화면에서 입장이 진행됩니다.</li>
              <li>
                기본 플레이 시간은 팀당 {data.settings.playMinutes}분으로
                계산됩니다.
              </li>
              <li>룸 수: {data.settings.roomCount}개</li>
            </ul>
          </section>
        </div>
      ) : (
        <div className="page admin-page">
          <section className="admin-top-grid">
            <div className="admin-card">
              <h3>매장 설정</h3>

              <div className="input-group">
                <label>매장명</label>
                <input
                  type="text"
                  value={data.settings.storeName}
                  onChange={(e) => handleStoreNameChange(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>팀당 플레이 시간(분)</label>
                <input
                  type="number"
                  min="1"
                  value={data.settings.playMinutes}
                  onChange={(e) => handlePlayMinutesChange(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>룸 수</label>
                <input
                  type="number"
                  min="1"
                  value={data.settings.roomCount}
                  onChange={(e) => handleRoomCountChange(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-card">
              <h3>로고 설정</h3>

              <div className="input-group">
                <label>로고 이미지 URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                />
              </div>

              <div className="button-row">
                <button className="primary-btn" onClick={handleLogoSave}>
                  로고 저장
                </button>
                <button className="ghost-btn" onClick={handleRemoveLogo}>
                  로고 제거
                </button>
              </div>

              <p className="mini-text">
                직접 업로드가 아니라 이미지 주소(URL)를 넣는 방식입니다.
              </p>
            </div>

            <div className="admin-card center-card">
              <h3>현재 호출 번호</h3>
              <div className="big-number">
                {data.currentNumber ? `${data.currentNumber}번` : "-"}
              </div>

              <div className="button-column">
                <button className="primary-btn big-btn" onClick={handleCallNext}>
                  다음 팀 호출
                </button>
                <button className="danger-btn" onClick={handleResetAll}>
                  전체 초기화
                </button>
              </div>
            </div>
          </section>

          <section className="list-section">
            <div className="list-card">
              <div className="list-header">
                <h3>대기 목록</h3>
                <span>{data.waitingList.length}팀</span>
              </div>

              {data.waitingList.length === 0 ? (
                <div className="empty-box">현재 대기 목록이 없습니다.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>번호</th>
                        <th>대표자</th>
                        <th>인원</th>
                        <th>테이블번호</th>
                        <th>연락처</th>
                        <th>등록시간</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.waitingList.map((item) => (
                        <tr key={item.id}>
                          <td>{item.number}번</td>
                          <td>{item.name}</td>
                          <td>{item.people}명</td>
                          <td>{item.tableNumber}</td>
                          <td>{item.phone || "-"}</td>
                          <td>{item.createdAt}</td>
                          <td>
                            <button
                              className="small-danger-btn"
                              onClick={() => handleCancelWaiting(item.id)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="list-card">
              <div className="list-header">
                <h3>호출 완료 목록</h3>
                <span>{data.calledList.length}팀</span>
              </div>

              {data.calledList.length === 0 ? (
                <div className="empty-box">아직 호출된 팀이 없습니다.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>번호</th>
                        <th>대표자</th>
                        <th>인원</th>
                        <th>테이블번호</th>
                        <th>호출시간</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.calledList.map((item) => (
                        <tr key={item.id}>
                          <td>{item.number}번</td>
                          <td>{item.name}</td>
                          <td>{item.people}명</td>
                          <td>{item.tableNumber}</td>
                          <td>{item.calledAt || "-"}</td>
                          <td>
                            <button
                              className="small-danger-btn"
                              onClick={() => handleRemoveCalled(item.id)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
