"use client";

import { useEffect, useState } from "react";
import { classById } from "./progress";
import type { StudyState } from "./types";

const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function FocusStudio({ state, classFilter, complete }: { state: StudyState; classFilter: string; complete: (classId: string, minutes: number, label: string, taskId?: string) => void }) {
  const [timerType, setTimerType] = useState<"Pomodoro" | "Stopwatch">("Pomodoro");
  const [phase, setPhase] = useState<"Focus" | "Break">("Focus");
  const [seconds, setSeconds] = useState(state.settings.focusMinutes * 60);
  const [stopwatch, setStopwatch] = useState(0);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("");
  const [cycles, setCycles] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const [taskId, setTaskId] = useState("");
  const total = (phase === "Focus" ? state.settings.focusMinutes : state.settings.breakMinutes) * 60;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (timerType === "Stopwatch") setStopwatch((value) => value + 1);
      else setSeconds((value) => {
        if (value > 1) return value - 1;
        if (phase === "Focus") {
          complete(classFilter, state.settings.focusMinutes, label || "Pomodoro focus session", taskId || undefined);
          setCycles((count) => count + 1); setPhase("Break");
          if (state.settings.notifications && Notification.permission === "granted") new Notification("StudyBloom", { body: "Focus block finished. Your break starts now." });
          return state.settings.breakMinutes * 60;
        }
        setPhase("Focus");
        if (state.settings.notifications && Notification.permission === "granted") new Notification("StudyBloom", { body: "Break finished. Ready for another focus block?" });
        return state.settings.focusMinutes * 60;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, timerType, phase, classFilter, complete, label, taskId, state.settings.focusMinutes, state.settings.breakMinutes, state.settings.notifications]);

  const choosePhase = (next: "Focus" | "Break") => { setPhase(next); setRunning(false); setSeconds((next === "Focus" ? state.settings.focusMinutes : state.settings.breakMinutes) * 60); };
  const chooseType = (next: "Pomodoro" | "Stopwatch") => { setTimerType(next); setRunning(false); };
  const saveStopwatch = () => { if (stopwatch >= 60) complete(classFilter, Math.max(1, Math.round(stopwatch / 60)), label || "Stopwatch study session", taskId || undefined); setRunning(false); };
  const percent = timerType === "Pomodoro" ? Math.min(100, seconds / Math.max(total, 1) * 100) : (stopwatch % 3600) / 36;

  return <><div className="sb2-page-head"><div><small>PROTECT YOUR ATTENTION</small><h1>Study clock</h1><p>Pomodoro focus blocks, automatic breaks, and an open-ended stopwatch.</p></div><span className="sb3-cycle-count">{cycles} focus cycle{cycles === 1 ? "" : "s"} today</span></div><div className="sb2-focus-layout"><section className="sb2-focus-card"><div className="sb3-clock-type"><button className={timerType === "Pomodoro" ? "active" : ""} onClick={() => chooseType("Pomodoro")}>Pomodoro</button><button className={timerType === "Stopwatch" ? "active" : ""} onClick={() => chooseType("Stopwatch")}>Stopwatch</button></div>{timerType === "Pomodoro" && <div className="sb2-mode-switch"><button className={phase === "Focus" ? "active" : ""} onClick={() => choosePhase("Focus")}>Focus · {state.settings.focusMinutes} min</button><button className={phase === "Break" ? "active" : ""} onClick={() => choosePhase("Break")}>Break · {state.settings.breakMinutes} min</button></div>}<div className="sb2-timer" style={{ background: `conic-gradient(#795ac8 ${percent}%, #ece7f5 0)` }}><div><b>{clock(timerType === "Pomodoro" ? seconds : stopwatch)}</b><span>{running ? timerType === "Pomodoro" ? phase === "Focus" ? "Deep work in progress" : "Rest and reset" : "Time is running" : "Ready when you are"}</span></div></div><div className="sb2-timer-controls"><button onClick={() => { setRunning(false); if (timerType === "Pomodoro") setSeconds(total); else { setStopwatch(0); setLaps([]); } }}>↺</button><button onClick={() => setRunning(!running)}>{running ? "Ⅱ" : "▶"}</button>{timerType === "Pomodoro" ? <button onClick={() => setSeconds(Math.max(0, seconds - 60))}>−1m</button> : <button onClick={() => setLaps((current) => [...current, stopwatch])}>Lap</button>}</div>{timerType === "Stopwatch" && <div className="sb3-stopwatch-actions"><button disabled={!stopwatch} onClick={saveStopwatch}>Save {Math.round(stopwatch / 60)} min session</button>{laps.length > 0 && <div>{laps.slice(-4).map((lap, index) => <span key={`${lap}-${index}`}>Lap {laps.length - Math.min(3, laps.length - 1) + index}: {clock(lap)}</span>)}</div>}</div>}</section><aside className="sb2-focus-prep"><span>✦</span><h2>Set your intention</h2><label>What will you finish?<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Finish problems 1–12"/></label><label>Class<select value={classFilter} disabled><option>{classById(state.classes, classFilter).name}</option></select></label><label>Track toward schoolwork<select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">General study time</option>{state.tasks.filter((task) => task.classId === classFilter && !task.done).map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label><small className="sb3-autosave-note">Session time and assignment progress save automatically when a Pomodoro ends or you save the stopwatch.</small><div className="sb2-prep-list"><p><i>1</i>Choose one visible outcome</p><p><i>2</i>Keep your whiteboard or notes nearby</p><p><i>3</i>Use the break—don’t skip recovery</p></div><div className="sb3-session-guide"><b>Suggested rhythm</b><p>{state.settings.focusMinutes} min focus → {state.settings.breakMinutes} min break</p><small>After four cycles, take a longer 15–30 minute break.</small></div></aside></div></>;
}
