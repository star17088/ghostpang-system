import React, { useEffect, useMemo, useState } from "react";
import "./style.css";

const STORAGE_KEY = "ghostpang_waiting_data_v4";

const initialState = {
  waitingList: [],
  currentNumber: null,
  calledList: [],
  settings: {
    storeName: "GHOST PANG",
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
  } catch {
    return initialState;
  }
}

export default function App() {
  const [data, setData] = useState(getSavedData());
  const [mode, setMode] = useState("customer");
  const [teamName, setTeamName] = useState("");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState("");
  const [tableNumber, setTableNumber] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const nextWaitingNumber = useMemo(() => {
    const nums = [...data.waitingList, ...data.calledList]
      .map((v) => v.number)
      .filter(Boolean);
    return nums.length ? Math.max(...nums) + 1 : 1;
  }, [data.waitingList, data.calledList]);

  const waitingCount = data.waitingList.length;
  const estimatedMinutes = waitingCount * data.settings.playMinutes;

  const handleCustomerLogin = () => {
    if (!teamName.trim()) {
      alert("팀명을 입력해주세요.");
      return;
    }
    if (!phone.trim()) {
      alert("전화번호를 입력해주세요.");
      return;
    }

    const newItem = {
      id: Date.now(),
      number: nextWaitingNumber,
      teamName: teamName.trim(),
      phone: phone.trim(),
      people: people.trim() ? Number(people) : 0,
      tableNumber: tableNumber.trim(),
      createdAt: new Date().toLocaleString("ko-KR"),
      status: "waiting"
    };

    setData((prev) => ({
      ...prev,
      waitingList: [...prev.waitingList, newItem]
    }));

    alert(`${newItem.number}번 대기 등록 완료`);

    setTeamName("");
    setPhone("");
    setPeople("");
    setTableNumber("");
  };

  const handleCallNext = () => {
    if (!data.waitingList.length) {
      alert("현재 대기팀이 없습니다.");
      return;
    }

    const next = data.waitingList[0];
    const calledItem = {
      ...next,
      status: "called",
      calledAt: new Date().toLocaleString("ko-KR")
    };

    setData((prev) => ({
      ...prev,
      currentNumber: calledItem.number,
      waitingList: prev.waitingList.slice(1),
      calledList: [calledItem, ...prev.calledList]
    }));
  };

  const handleDeleteWaiting = (id) => {
    if (!window.confirm("이 대기팀을 삭제할까요?")) return;
    setData((prev) => ({
      ...prev,
      waitingList: prev.waitingList.filter((item) => item.id !== id)
    }));
  };

  const handleDeleteCalled = (id) => {
    if (!window.confirm("이 항목을 삭제할까요?")) return;
    setData((prev) => ({
      ...prev,
      calledList: prev.calledList.filter((item) => item.id !== id)
    }));
  };

  const handleResetAll = () => {
    if (!window.confirm("전체 대기 목록을 초기화할까요?")) return;
    setData((prev) => ({
      ...prev,
      waitingList: [],
      calledList: [],
      currentNumber: null
    }));
  };

  return (
    <div className="app">
      <div className="mode-tabs">
        <button
          className={mode === "customer" ? "active" : ""}
          onClick={() => setMode("customer")}
        >
          고객용
        </button>
        <button
          className={mode === "admin" ? "active" : ""}
          onClick={() => setMode("admin")}
        >
          관리자용
        </button>
      </div>

      {mode === "customer" ? (
        <div className="customer-page">
          <div className="login-card">
            <div className="brand-mini">{data.settings.storeName}</div>
            <h1>고객 로그인</h1>
            <p>팀명과 전화번호를 입력해주세요</p>

            <div className="login-form">
              <input
                type="text"
                placeholder="팀명"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <input
                type="text"
                placeholder="전화번호"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                type="number"
                placeholder="인원수(선택)"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
              />
              <input
                type="text"
                placeholder="테이블번호(선택)"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />

              <button className="login-btn" onClick={handleCustomerLogin}>
                로그인
              </button>
            </div>

            <div className="customer-status">
              <div className="status-box">
                <span>현재 호출</span>
                <strong>
                  {data.currentNumber ? `${data.currentNumber}번` : "-"}
                </strong>
              </div>
              <div className="status-box">
                <span>대기팀</span>
                <strong>{waitingCount}팀</strong>
              </div>
              <div className="status-box">
                <span>예상대기</span>
                <strong>{estimatedMinutes}분</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-page">
          <div className="admin-header-card">
            <div>
              <div className="brand-mini">{data.settings.storeName}</div>
              <h2>대기 관리자</h2>
            </div>
            <div className="admin-current">
              현재 호출:{" "}
              <strong>{data.currentNumber ? `${data.currentNumber}번` : "-"}</strong>
            </div>
          </div>

          <div className="admin-actions">
            <button className="primary-btn" onClick={handleCallNext}>
              다음 팀 호출
            </button>
            <button className="danger-btn" onClick={handleResetAll}>
              전체 초기화
            </button>
          </div>

          <div className="admin-grid">
            <div className="panel">
              <div className="panel-head">
                <h3>대기 목록</h3>
                <span>{data.waitingList.length}팀</span>
              </div>

              {data.waitingList.length === 0 ? (
                <div className="empty-box">현재 대기팀이 없습니다.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>번호</th>
                        <th>팀명</th>
                        <th>전화번호</th>
                        <th>인원</th>
                        <th>테이블</th>
                        <th>등록시간</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.waitingList.map((item) => (
                        <tr key={item.id}>
                          <td>{item.number}번</td>
                          <td>{item.teamName}</td>
                          <td>{item.phone}</td>
                          <td>{item.people || "-"}</td>
                          <td>{item.tableNumber || "-"}</td>
                          <td>{item.createdAt}</td>
                          <td>
                            <button
                              className="table-delete-btn"
                              onClick={() => handleDeleteWaiting(item.id)}
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

            <div className="panel">
              <div className="panel-head">
                <h3>호출 완료</h3>
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
                        <th>팀명</th>
                        <th>전화번호</th>
                        <th>호출시간</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.calledList.map((item) => (
                        <tr key={item.id}>
                          <td>{item.number}번</td>
                          <td>{item.teamName}</td>
                          <td>{item.phone}</td>
                          <td>{item.calledAt || "-"}</td>
                          <td>
                            <button
                              className="table-delete-btn"
                              onClick={() => handleDeleteCalled(item.id)}
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
          </div>
        </div>
      )}
    </div>
  );
}
