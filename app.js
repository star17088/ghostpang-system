import React, { useEffect, useState } from "react";
import "./style.css";
import { db } from "./firebase";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

export default function App() {
  const [mode, setMode] = useState("customer");
  const [teamName, setTeamName] = useState("");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState("");
  const [waitingList, setWaitingList] = useState([]);
  const [calledNumber, setCalledNumber] = useState(null);

  // 🔥 실시간 데이터 불러오기
  useEffect(() => {
    const q = query(
      collection(db, "ghostpang_waiting"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docItem, index) => ({
        id: docItem.id,
        waitingNumber: index + 1,
        ...docItem.data()
      }));
      setWaitingList(list);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 고객 등록
  const handleRegister = async () => {
    if (!teamName.trim()) {
      alert("팀명을 입력해주세요.");
      return;
    }

    if (!phone.trim()) {
      alert("전화번호를 입력해주세요.");
      return;
    }

    try {
      await addDoc(collection(db, "ghostpang_waiting"), {
        teamName: teamName.trim(),
        phone: phone.trim(),
        peopleCount: people ? Number(people) : 0,
        status: "waiting",
        createdAt: serverTimestamp()
      });

      alert("대기 등록 완료");

      setTeamName("");
      setPhone("");
      setPeople("");
    } catch (error) {
      alert("등록 실패");
      console.error(error);
    }
  };

  // 🔥 다음 팀 호출
  const handleCallNext = async () => {
    if (waitingList.length === 0) {
      alert("대기팀이 없습니다.");
      return;
    }

    const first = waitingList[0];

    try {
      await updateDoc(doc(db, "ghostpang_waiting", first.id), {
        status: "called",
        calledAt: serverTimestamp()
      });

      setCalledNumber(first.waitingNumber);

      await deleteDoc(doc(db, "ghostpang_waiting", first.id));
    } catch (error) {
      alert("호출 실패");
      console.error(error);
    }
  };

  // 🔥 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("삭제할까요?")) return;

    try {
      await deleteDoc(doc(db, "ghostpang_waiting", id));
    } catch (error) {
      alert("삭제 실패");
      console.error(error);
    }
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
            <div className="brand-mini">GHOST PANG</div>
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

              <button className="login-btn" onClick={handleRegister}>
                등록하기
              </button>
            </div>

            <div className="customer-status">
              <div className="status-box">
                <span>현재 대기팀</span>
                <strong>{waitingList.length}팀</strong>
              </div>
              <div className="status-box">
                <span>현재 호출</span>
                <strong>{calledNumber ? `${calledNumber}번` : "-"}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-page">
          <div className="admin-header-card">
            <div>
              <div className="brand-mini">GHOST PANG</div>
              <h2>대기 관리자</h2>
            </div>
            <div className="admin-current">
              현재 호출: <strong>{calledNumber ? `${calledNumber}번` : "-"}</strong>
            </div>
          </div>

          <div className="admin-actions">
            <button className="primary-btn" onClick={handleCallNext}>
              다음 팀 호출
            </button>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>대기 목록</h3>
              <span>{waitingList.length}팀</span>
            </div>

            {waitingList.length === 0 ? (
              <div className="empty-box">현재 대기팀이 없습니다.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>순번</th>
                      <th>팀명</th>
                      <th>전화번호</th>
                      <th>인원</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitingList.map((item) => (
                      <tr key={item.id}>
                        <td>{item.waitingNumber}번</td>
                        <td>{item.teamName}</td>
                        <td>{item.phone}</td>
                        <td>{item.peopleCount || "-"}</td>
                        <td>
                          <button
                            className="table-delete-btn"
                            onClick={() => handleDelete(item.id)}
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
      )}
    </div>
  );
}
