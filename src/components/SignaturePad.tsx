import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export type SignaturePadHandle = {
  isEmpty: () => boolean;
  clear: () => void;
  toDataURL: () => string | null;
};

type Props = { height?: number; className?: string };

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { height = 180, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const emptyRef = useRef(true);
  const [, setTick] = useState(0);

  function ctx() {
    const c = canvasRef.current;
    return c ? c.getContext("2d") : null;
  }

  function resize() {
    const c = canvasRef.current;
    if (!c) return;
    const parent = c.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = height;
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const g = c.getContext("2d");
    if (g) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = "#0a0a0a";
      g.lineWidth = 2;
    }
  }

  useEffect(() => {
    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPos(e: PointerEvent | React.PointerEvent) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = getPos(e);
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const g = ctx();
    const last = lastRef.current;
    if (!g || !last) return;
    const p = getPos(e);
    g.beginPath();
    g.moveTo(last.x, last.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    lastRef.current = p;
    if (emptyRef.current) {
      emptyRef.current = false;
      setTick((t) => t + 1);
    }
  }
  function onUp() {
    drawingRef.current = false;
    lastRef.current = null;
  }

  function clear() {
    const c = canvasRef.current;
    const g = ctx();
    if (!c || !g) return;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    g.restore();
    emptyRef.current = true;
    setTick((t) => t + 1);
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => emptyRef.current,
    clear,
    toDataURL: () => (canvasRef.current ? canvasRef.current.toDataURL("image/png") : null),
  }));

  return (
    <div className={className}>
      <div className="relative rounded-md border-2 border-dashed border-primary/30 bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          className="block w-full cursor-crosshair"
        />
        {emptyRef.current && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/60 text-sm">
            Assine aqui com o dedo ou mouse
          </div>
        )}
      </div>
      <div className="flex justify-end mt-2">
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          <Eraser className="size-4 mr-1" /> Limpar
        </Button>
      </div>
    </div>
  );
});
