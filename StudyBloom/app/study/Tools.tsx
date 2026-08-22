"use client";

import { useEffect, useRef, useState } from "react";

export type InkPoint = { x: number; y: number; pressure: number };
export type InkStroke = { points: InkPoint[]; color: string; width: number; eraser: boolean };

function drawStrokes(canvas: HTMLCanvasElement, strokes: InkStroke[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";
  strokes.forEach((stroke) => {
    if (stroke.points.length < 2) return;
    context.save();
    context.globalCompositeOperation = stroke.eraser ? "destination-out" : "source-over";
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.beginPath();
    context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    stroke.points.slice(1).forEach((point) => context.lineTo(point.x * width, point.y * height));
    context.stroke();
    context.restore();
  });
}

export function Whiteboard({ value = [], onChange, compact = false }: { value?: InkStroke[]; onChange?: (strokes: InkStroke[]) => void; compact?: boolean }) {
  const [strokes, setStrokes] = useState<InkStroke[]>(value);
  const [color, setColor] = useState("#2f2940");
  const [width, setWidth] = useState(3);
  const [eraser, setEraser] = useState(false);
  const [paper, setPaper] = useState<"grid" | "dots" | "plain">("grid");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => { if (canvas.current) drawStrokes(canvas.current, strokes); }, [strokes]);
  useEffect(() => {
    const resize = () => canvas.current && drawStrokes(canvas.current, strokes);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [strokes]);

  const change = (next: InkStroke[]) => { setStrokes(next); onChange?.(next); };
  const point = (event: React.PointerEvent<HTMLCanvasElement>): InkPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height, pressure: event.pressure || 0.5 };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    change([...strokes, { points: [point(event)], color, width: width * (event.pointerType === "pen" ? Math.max(0.65, event.pressure || 0.5) : 1), eraser }]);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const next = [...strokes];
    const last = next[next.length - 1];
    next[next.length - 1] = { ...last, points: [...last.points, point(event)] };
    change(next);
  };
  const stop = () => { drawing.current = false; };
  const download = () => {
    if (!canvas.current) return;
    const link = document.createElement("a");
    link.href = canvas.current.toDataURL("image/png");
    link.download = `studybloom-whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };

  return <div className={`sb3-whiteboard ${compact ? "compact" : ""}`}>
    <div className="sb3-board-tools">
      <div>{["#2f2940", "#7557c7", "#2477c5", "#d3566d", "#2c8a5d"].map((item) => <button aria-label={`Ink ${item}`} className={color === item && !eraser ? "active" : ""} style={{ background: item }} onClick={() => { setColor(item); setEraser(false); }} key={item}/>)}</div>
      <button className={!eraser ? "active tool" : "tool"} onClick={() => setEraser(false)}>✎ Pen</button>
      <button className={eraser ? "active tool" : "tool"} onClick={() => setEraser(true)}>⌫ Eraser</button>
      <label>Size <input type="range" min="1" max="14" value={width} onChange={(event) => setWidth(Number(event.target.value))}/></label>
      <select aria-label="Whiteboard paper" value={paper} onChange={(event) => setPaper(event.target.value as typeof paper)}><option value="grid">Grid</option><option value="dots">Dots</option><option value="plain">Plain</option></select>
      <button className="tool" disabled={!strokes.length} onClick={() => change(strokes.slice(0, -1))}>↶ Undo</button>
      <button className="tool" disabled={!strokes.length} onClick={() => change([])}>Clear</button>
      {!compact && <button className="tool" onClick={download}>↓ PNG</button>}
    </div>
    <div className={`sb3-board-paper ${paper}`}><canvas ref={canvas} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} aria-label="Drawing whiteboard for mouse, touch, or Apple Pencil"/></div>
    <small>Apple Pencil, touch, and mouse supported · palm-friendly pointer input</small>
  </div>;
}

function safeCalculate(input: string) {
  const normalized = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**").replace(/\b(sin|cos|tan|sqrt|abs|log|exp|round|floor|ceil)\b/g, "Math.$1").replace(/\bpi\b/gi, "Math.PI");
  if (!/^[0-9+\-*/().,\s*MathPIabcdefghijklmnopqrstuvwxyz]+$/i.test(normalized)) throw new Error("Invalid expression");
  const result = Function(`"use strict"; return (${normalized})`)();
  if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("No finite result");
  return Number(result.toPrecision(12)).toString();
}

function MiniGraph({ expression }: { expression: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const context = canvas.getContext("2d"); if (!context) return;
    const ratio = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * ratio; canvas.height = h * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, w, h);
    context.strokeStyle = "#e5dff0"; context.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { context.beginPath(); context.moveTo(i * w / 10, 0); context.lineTo(i * w / 10, h); context.stroke(); context.beginPath(); context.moveTo(0, i * h / 10); context.lineTo(w, i * h / 10); context.stroke(); }
    context.strokeStyle = "#8b8297"; context.beginPath(); context.moveTo(0, h / 2); context.lineTo(w, h / 2); context.moveTo(w / 2, 0); context.lineTo(w / 2, h); context.stroke();
    const source = expression.replace(/\^/g, "**").replace(/\b(sin|cos|tan|sqrt|abs|log|exp)\b/g, "Math.$1");
    if (!/^[0-9x+\-*/().,\s*Mathsincotaqrblogexp]+$/i.test(source)) return;
    try { const fn = Function("x", `return (${source})`) as (x: number) => number; context.strokeStyle = "#7557c7"; context.lineWidth = 2.5; context.beginPath(); let active = false; for (let px = 0; px < w; px++) { const x = (px - w / 2) / 20; const y = fn(x); const py = h / 2 - y * 20; if (Number.isFinite(py) && Math.abs(py) < h * 3) { if (!active) context.moveTo(px, py); else context.lineTo(px, py); active = true; } else active = false; } context.stroke(); } catch { /* keep axes visible */ }
  }, [expression]);
  return <canvas className="sb3-mini-graph" ref={ref}/>;
}

export function ToolDock() {
  const [tool, setTool] = useState<"calculator" | "whiteboard" | null>(null);
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [tab, setTab] = useState<"calc" | "graph">("calc");
  const [graph, setGraph] = useState("sin(x) + x/4");
  const [savedInk, setSavedInk] = useState<InkStroke[]>([]);
  useEffect(() => { try { setSavedInk(JSON.parse(localStorage.getItem("studybloom-whiteboard") || "[]")); } catch { /* blank board */ } }, []);
  const saveInk = (ink: InkStroke[]) => { setSavedInk(ink); localStorage.setItem("studybloom-whiteboard", JSON.stringify(ink)); };
  const calculate = () => { try { setResult(safeCalculate(expression)); } catch { setResult("Check expression"); } };
  return <>
    <div className="sb3-tool-dock"><button onClick={() => setTool("whiteboard")}><span>✎</span>Whiteboard</button><button onClick={() => setTool("calculator")}><span>∑</span>Calculator</button></div>
    {tool && <div className="sb2-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setTool(null)}><section className={`sb3-tool-modal ${tool === "whiteboard" ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={tool === "whiteboard" ? "Whiteboard" : "Calculator and graphing tool"}><button className="sb2-modal-close" onClick={() => setTool(null)}>×</button>{tool === "whiteboard" ? <><header><span>✎</span><div><small>SHOW YOUR THINKING</small><h2>Whiteboard notebook</h2><p>Work equations, sketch diagrams, or handwrite notes with Apple Pencil.</p></div></header><Whiteboard value={savedInk} onChange={saveInk}/></> : <><header><span>∑</span><div><small>QUICK MATH TOOLS</small><h2>Calculator & grapher</h2></div></header><div className="sb3-calc-tabs"><button className={tab === "calc" ? "active" : ""} onClick={() => setTab("calc")}>Calculator</button><button className={tab === "graph" ? "active" : ""} onClick={() => setTab("graph")}>Graph</button></div>{tab === "calc" ? <div className="sb3-calculator"><output>{result}</output><input aria-label="Calculator expression" value={expression} onChange={(event) => setExpression(event.target.value)} onKeyDown={(event) => event.key === "Enter" && calculate()} placeholder="e.g. (24 * 3) / 8"/><div>{["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "(", ")", "sqrt(", "pi", "^", "+"].map((key) => <button onClick={() => setExpression((value) => value + key)} key={key}>{key}</button>)}</div><footer><button onClick={() => { setExpression(""); setResult("0"); }}>Clear</button><button className="sb2-primary" onClick={calculate}>=</button></footer></div> : <div className="sb3-popup-graph"><label>f(x) = <input value={graph} onChange={(event) => setGraph(event.target.value)}/></label><MiniGraph expression={graph}/><small>Supports powers, sin, cos, tan, sqrt, abs, log, and exp.</small></div>}</>}</section></div>}
  </>;
}
