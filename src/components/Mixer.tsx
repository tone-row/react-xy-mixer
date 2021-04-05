import {
  CSSProperties,
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./Mixer.css";

type LayoutMode = "MANUAL" | "AUTO";

const DEFAULT_SIZE = 300;

interface useMixerOptions {
  size?: number;
  rotate?: number;
  handleOffset?: number;
  boundary?: "polygon" | "box";
}

function getNumNodes(nodes: number | number[][]) {
  return typeof nodes === "number" ? nodes : nodes.length;
}

export function useMixer(
  initialNodes: number | number[][],
  options: useMixerOptions = {
    size: DEFAULT_SIZE,
    rotate: 0,
    handleOffset: 0,
    boundary: "box",
  }
): [MixerProps, number[]] {
  const [nodes] = useState(initialNodes);
  const { size = DEFAULT_SIZE } = options;
  // need to effectually update i guess???

  // This should actually correspond to the starting position probably
  const [weights, setWeights] = useState<number[]>(
    Array(getNumNodes(nodes))
      .fill(0)
      .map((_, i) => (i === 0 ? 1 : 0))
  );

  //
  const setup = useMemo(() => {
    let arrayOfNodes = Array.isArray(nodes)
      ? nodes
      : Array(nodes)
          .fill(0)
          .map((_, i) =>
            getPointCoord(
              0.5,
              i * ((2 * Math.PI) / nodes) -
                (Math.PI / 2 + (options.rotate ?? 0))
            )
          );

    // normalize coordinates
    const xsYs = arrayOfNodes.reduce(
      (acc, node) => [acc[0].concat(node[0]), acc[1].concat(node[1])],
      [[], []] as number[][]
    );

    const limits = {
      xMin: Math.min(...xsYs[0]),
      xMax: Math.max(...xsYs[0]),
      yMin: Math.min(...xsYs[1]),
      yMax: Math.max(...xsYs[1]),
    };

    const normalizedNodes = arrayOfNodes.map(([x, y]) => [
      (x - limits.xMin) / (limits.xMax - limits.xMin),
      // stretch out the y axis accordingly
      y / (limits.xMax - limits.xMin),
    ]);

    // map coordinates [0-1,] to SVG size
    const resizedNodes = normalizedNodes.reduce((acc, point) => {
      return [...acc, point.map((p) => p * size)];
    }, [] as number[][]);

    return {
      n: resizedNodes.length,
      nodes: resizedNodes,
      mode: Array.isArray(nodes)
        ? ("MANUAL" as LayoutMode)
        : ("AUTO" as LayoutMode),
    };
  }, [nodes, options.rotate, size]);

  let componentProps: MixerProps = {
    setWeights,
    size,
    n: setup.n,
    nodes: setup.nodes,
    mode: setup.mode,
    handleOffset: options.handleOffset ?? 0,
    boundary: options.boundary ?? setup.mode === "AUTO" ? "polygon" : "box",
  };

  return [componentProps, weights];
}

interface MixerProps {
  size: number;
  handleOffset: number;
  setWeights: Dispatch<SetStateAction<number[]>>;
  n: number;
  nodes: number[][];
  boundary: "polygon" | "box"; // 'user'
  mode: "AUTO" | "MANUAL";
}

// need to scope svg boundary definition
// for when multiple elements on the same page
// because SVG's share definition scope
let defScopeIncrement = 0;

export default function Mixer(
  props: MixerProps & React.SVGProps<SVGSVGElement>
) {
  let {
    n,
    size,
    setWeights,
    nodes,
    boundary,
    handleOffset = 0,
    mode,
    ...svgProps
  } = props;

  const id = useRef(`boundary-${defScopeIncrement++}`);

  const handle = useRef<SVGCircleElement | null>(null);

  // Initial Handle Position
  const [center, setCenter] = useState({
    x: size / 2,
    y: size / 2,
  });

  const { boundaryFns, box, matrix } = useMemo(() => {
    let matrix = [];
    for (const p1 of nodes) {
      let n = [];
      for (const p2 of nodes) {
        n.push(innerProduct(p1, p2));
      }
      matrix.push(n);
    }

    // @ts-ignore
    matrix = array2mat(matrix);

    const box = nodes.reduce(
      (acc, point) => ({
        yMin: Math.min(acc.yMin, point[1]),
        yMax: Math.max(acc.yMax, point[1]),
        xMin: Math.min(acc.xMin, point[0]),
        xMax: Math.max(acc.xMax, point[0]),
      }),
      {
        yMin: size,
        yMax: 0,
        xMin: size,
        xMax: 0,
      }
    );

    // This should be determined by boundary strategy
    const boundaryFns =
      boundary === "polygon"
        ? getAutoLayoutBoundaryFns(nodes)
        : {
            [box.yMin - handleOffset]: {
              [box.yMax + handleOffset]: [
                (_y: number) => box.xMin,
                (_y: number) => box.xMax,
              ],
            },
          };

    return { boundaryFns, box, matrix };
  }, [boundary, handleOffset, nodes, size]);

  // Function to get x axis boundary from y value
  const getBounds = useCallback(
    (currentY: number) => {
      let fns = [] as ((y: number) => number)[];
      // make sure y is bounded
      const y = Math.max(Math.min(currentY, box.yMax), box.yMin);

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
    [boundaryFns, box.yMax, box.yMin, n, size]
  );

  const getWeights = useCallback(
    ({ x: x1, y: y1 }: { x: number; y: number }) => {
      let m = [];
      for (const point of nodes) {
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
    [matrix, nodes]
  );

  useEffect(() => {
    const cHandle = handle.current;
    if (cHandle) {
      let svg = cHandle.parentNode?.parentNode as SVGSVGElement;
      const getMousePosition = (evt: MouseEvent | TouchEvent) => {
        var CTM = svg.getScreenCTM();
        let e = "touches" in evt ? evt.touches[0] : evt;
        if (CTM && e) {
          return {
            x: (e.clientX - CTM.e) / CTM.a,
            y: (e.clientY - CTM.f) / CTM.d,
          };
        }
        return null;
      };

      let isDragging = false;
      const startDrag = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        drag(e);
      };

      const drag = (e: MouseEvent | TouchEvent) => {
        if (isDragging) {
          e.preventDefault();
          e.stopPropagation();
          const coord = getMousePosition(e);
          if (coord) {
            const bounds = getBounds(coord.y);
            let boundedCoord = {
              x: Math.max(Math.min(coord.x, bounds.maxX), bounds.minX),
              y: bounds.y,
            };
            // get distance from each point
            const w = getWeights(boundedCoord);
            setWeights(w);
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

      // Mobile
      svg.addEventListener("touchstart", startDrag);
      window.addEventListener("touchmove", drag, { passive: false });
      window.addEventListener("touchend", endDrag);
      window.addEventListener("touchleave", endDrag);
      window.addEventListener("touchcancel", endDrag);

      return () => {
        svg.removeEventListener("mousedown", startDrag);
        window.removeEventListener("mousemove", drag);
        window.removeEventListener("mouseup", endDrag);
        window.removeEventListener("mouseleave", endDrag);

        svg.removeEventListener("touchstart", startDrag);
        window.removeEventListener("touchmove", drag);
        window.removeEventListener("touchend", endDrag);
        window.removeEventListener("touchleave", endDrag);
        window.removeEventListener("touchcancel", endDrag);
      };
    }
  }, [getBounds, getWeights, setWeights]);

  const handleSize = 10;

  const viewBox = `${box.xMin - handleOffset} ${box.yMin - handleOffset} ${
    2 * handleOffset + box.xMax - box.xMin
  } ${2 * handleOffset + box.yMax - box.yMin}`;

  return (
    <svg
      {...svgProps}
      className={["multi-range", props.className].filter(Boolean).join(" ")}
      viewBox={viewBox}
      width={box.xMax - box.xMin}
      height={box.yMax - box.yMin}
      style={
        {
          ...(props.style ?? {}),
        } as CSSProperties
      }
    >
      <defs>
        <polygon
          id={id.current}
          points={nodes.map((point) => point.join(",")).join(" ")}
        />
        <clipPath id="clip">
          <use xlinkHref={`#${id.current}`} />
        </clipPath>
      </defs>
      <g>
        <use
          xlinkHref={`#${id.current}`}
          className="multi-range__polygon polygon"
        />
        <circle
          className="multi-range__handler handle"
          cx={center.x}
          cy={center.y}
          r={handleSize}
          ref={handle}
        />
      </g>
    </svg>
  );
}

function innerProduct(a: number[], b: number[]) {
  return a[0] * b[0] + a[1] + b[1];
}

function round(n: number, z: number = 5) {
  const x = Math.pow(10, 5);
  return Math.round(n * x) / x;
}

function getPointCoord(radius: number, radian: number) {
  return [
    round(radius * Math.cos(radian) + radius),
    round(radius * Math.sin(radian) + radius),
  ];
}

/**
 * This function returns the boundary functions which are used to determine the bounds of the handle.
 */
function getAutoLayoutBoundaryFns(nodes: number[][]) {
  const pairs = Array(nodes.length)
    .fill(null)
    .map((_, index) => {
      return [nodes[index], nodes[(index + 1) % nodes.length]];
    });
  return pairs.reduce((acc, pair) => {
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
}
