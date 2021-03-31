import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./MultiRange.css";

type useMultiRangeProps = {
  n: number;
};
export function useMultiRange({ n }: useMultiRangeProps) {
  const [weights, setWeights] = useState<number[]>(
    Array(n)
      .fill(0)
      .map((n, i) => (i === 0 ? 1 : 0))
  );
  let componentProps = {
    setWeights,
    n: n,
  };
  return { weights, componentProps };
}

export default function MultiRange({
  n,
  size,
  setWeights,
}: {
  size: number;
  n: number;
  setWeights: Dispatch<SetStateAction<number[]>>;
}) {
  if (n < 1) {
    throw new Error("n must be a postivie integer");
  }

  const handle = useRef<SVGCircleElement | null>(null);
  const [center, setCenter] = useState({
    x: size / 2,
    y: size / 2,
  });

  const { points, boundaryFns, maxY, minY, matrix } = useMemo(() => {
    // Boundary Polygon
    const points = Array(n)
      .fill(0)
      .map((_, i) => getPointCoord(size / 2, i * ((2 * Math.PI) / n)));

    let matrix = [];
    for (const p1 of points) {
      let n = [];
      for (const p2 of points) {
        n.push(innerProduct(p1, p2));
      }
      matrix.push(n);
    }

    // @ts-ignore
    matrix = array2mat(matrix);

    const { minY, maxY } = points.reduce(
      (acc, point) => ({
        minY: Math.min(acc.minY, point[1]),
        maxY: Math.max(acc.maxY, point[1]),
      }),
      {
        minY: size,
        maxY: 0,
      }
    );

    // Point pairs
    const pairs = Array(n)
      .fill(null)
      .map((_, index) => {
        return [points[index], points[(index + 1) % n]];
      });

    const boundaryFns = pairs.reduce((acc, pair) => {
      const [point1, point2] = pair.sort((a, b) => a[1] - b[1]);
      const [minY, maxY] = [point1[1], point2[1]].sort((a, b) => a - b);
      if (!(minY in acc)) {
        acc[minY] = {};
      }
      if (!(maxY in acc[minY])) {
        acc[minY][maxY] = [];
      }

      const [x1, y1] = point1;
      const [x2, y2] = point2;
      const m = (y2 - y1) / (x2 - x1);
      // Remove horizontal lines (no slope)
      // but accounting for rounding error
      if (Math.abs(m) > 0.0000001) {
        acc[minY][maxY].push((y: number) => {
          const slope = (y - y1) / m;
          const result = x1 + slope;
          return result ?? 0;
        });
      }

      return acc;
    }, {} as Record<number, Record<number, ((y: number) => number)[]>>);

    return { points, pairs, boundaryFns, minY, maxY, matrix };
  }, [n, size]);

  const getBounds = useCallback(
    (currentY: number) => {
      let fns = [] as ((y: number) => number)[];
      // make sure y is bounded
      const y = Math.max(Math.min(currentY, maxY), minY);

      for (const minY of Object.keys(boundaryFns)) {
        if (y >= parseFloat(minY)) {
          for (const maxY of Object.keys(boundaryFns[parseFloat(minY)])) {
            if (y <= parseFloat(maxY)) {
              fns = fns.concat(boundaryFns[parseFloat(minY)][parseFloat(maxY)]);
            }
          }
        }
      }

      const fnResults = fns.map((f) => f(y));
      const xs = fnResults.sort((a, b) => a - b);
      if (n === 1) {
        return { minX: size / 2, maxX: size / 2, y };
      } else if (n === 2) {
        return { minX: 0, maxX: size, y };
      } else {
        return { minX: Math.min(...xs), maxX: Math.max(...xs), y };
      }
    },
    [boundaryFns, maxY, minY, n, size]
  );

  const getWeights = useCallback(
    ({ x: x1, y: y1 }: { x: number; y: number }) => {
      let m = [];
      for (const point of points) {
        m.push(innerProduct([x1, y1], point));
      }
      // @ts-ignore
      m = array2mat(m);

      // @ts-ignore
      const result = solve(matrix, m);

      //@ts-ignore
      const x = sub(result, min(result));
      //@ts-ignore
      const final = entrywisediv(x, sum(x));

      return final as number[];
    },
    [matrix, points]
  );

  useEffect(() => {
    const cHandle = handle.current;
    if (cHandle) {
      let svg = cHandle.parentNode as SVGSVGElement;
      const getMousePosition = (evt: MouseEvent) => {
        var CTM = svg.getScreenCTM();
        if (CTM) {
          return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d,
          };
        }
        return null;
      };

      let isDragging = false;
      const startDrag: EventListener = (e) => {
        isDragging = true;
      };

      const drag = (e: MouseEvent) => {
        if (isDragging) {
          e.preventDefault();
          const coord = getMousePosition(e);
          if (coord) {
            const bounds = getBounds(coord.y);
            let boundedCoord = {
              x: Math.max(Math.min(coord.x, bounds.maxX), bounds.minX),
              y: bounds.y,
            };
            // get distance from each point
            setWeights(getWeights(boundedCoord));
            setCenter(boundedCoord);
          }
        }
      };

      const endDrag: EventListener = (e) => {
        isDragging = false;
      };

      svg.addEventListener("mousedown", startDrag);
      window.addEventListener("mousemove", drag);
      window.addEventListener("mouseup", endDrag);
      window.addEventListener("mouseleave", endDrag);

      return () => {
        svg.removeEventListener("mousedown", startDrag);
        window.removeEventListener("mousemove", drag);
        window.removeEventListener("mouseup", endDrag);
        window.removeEventListener("mouseleave", endDrag);
      };
    }
  }, [getBounds, getWeights, setWeights]);

  return (
    <svg className="multi-range" style={{ width: size, height: size }}>
      <circle
        className="multi-range__circle"
        cx={size / 2}
        cy={size / 2}
        r={size / 2}
      />
      <polygon
        className="multi-range__polygon"
        points={points.map((point) => point.join(",")).join(" ")}
      />
      <circle
        className="multi-range__handler draggable"
        cx={center.x}
        cy={center.y}
        r={Math.max(size / 16, 7)}
        ref={handle}
      />
    </svg>
  );
}

function innerProduct(a: number[], b: number[]) {
  return a[0] * b[0] + a[1] + b[1];
}

function round(n: number) {
  const x = 100000;
  return Math.round(n * x) / x;
}

function getPointCoord(radius: number, radian: number) {
  return [
    round(radius * Math.cos(radian) + radius),
    round(radius * Math.sin(radian) + radius),
  ];
}
