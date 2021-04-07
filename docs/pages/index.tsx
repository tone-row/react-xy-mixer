import { forwardRef } from "react";
import { MixerHandleProps, useMixer, Mixer } from "react-xy-mixer";
import { Box, Type } from "../components/slang";
import { borders, fonts, options } from "../components/options";

const CustomHandle = forwardRef<SVGPathElement, MixerHandleProps>(
  ({ center }, ref) => (
    <>
      <filter id="dropshadow" height="130%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="2" dy="2" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.5" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <path
        ref={ref}
        transform={`translate(${center.x - 45} ${center.y - 45})`}
        fill="hotpink"
        style={{ filter: "url(#dropshadow)" }}
        d="M 10,30
           A 20,20 0,0,1 50,30
           A 20,20 0,0,1 90,30
           Q 90,60 50,90
           Q 10,60 10,30 z"
      />
    </>
  )
);

const IndexPage = () => {
  const [props2, w] = useMixer(
    [
      [1, 0.25],
      [0.75, 0.79],
      [0.5, 0.6],
      [0.25, 0.25],
    ],
    {
      handleOffset: 10,
    }
  );

  const [props, weights] = useMixer(3, {
    // rotate: -Math.PI / 2,
    initial: 1,
    handleOffset: 12.5,
  });
  const styles = getStyle(weights);

  // Custom Handle
  const [handleProps, handleWeights] = useMixer(5, {
    handleOffset: 50,
    handle: CustomHandle,
  });

  return (
    <Box className="App" root content="start normal" p={4} gap={4}>
      <Type size={6} weight="700">
        react-xy-mixer
      </Type>
      <Type size={1}>
        A react component for mixing <em>n</em> vectors together by attributing
        each vector to a coordinate (x,y) and finding the barycentric
        coordinates of the draggable handle.
      </Type>
      <Box at={{ tablet: { template: "none / auto auto" } }}>
        <Mixer {...props2} />
        <Box>{JSON.stringify([...w])}</Box>
      </Box>
      <Box at={{ tablet: { template: "none / auto minmax(0, 1fr)" } }} gap={4}>
        <Box>
          <Mixer
            className="test-control"
            // style={props.nodes.reduce((acc, node, i) => {
            //   const key = `--xy${i}`;
            //   return { ...acc, [key]: node.map((pt) => `${pt}px`).join(" ") };
            // }, {})}
            {...props}
          />
        </Box>
        <Box className="style-pane" content="start normal" style={styles}>
          <h1>Hello World</h1>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Corrupti
            eius vel, dolorem ducimus iusto at provident et. Id temporibus nisi
            voluptates exercitationem vel, saepe beatae, quo dolorem obcaecati
            animi provident?
          </p>
          <Box template="none / repeat(2, minmax(0, 1fr)" items="center">
            <img src="http://placekitten.com/400/400" alt="Kitten" />
            <img src="http://placekitten.com/401/400" alt="Kitten" />
          </Box>
          <button>Click This Button</button>
        </Box>
      </Box>
      <Box>
        <Type size={2} as="h2">
          Custom Handle Example
        </Type>
        <Box
          at={{
            tablet: { template: "none / auto auto", items: "center start" },
          }}
        >
          <Mixer {...handleProps} className="custom-style" />
          <Type>{JSON.stringify(handleWeights)}</Type>
        </Box>
      </Box>
    </Box>
  );
};

export default IndexPage;

function getStyle(weights: number[]) {
  const r = options.reduce((acc, option, i) => {
    return option.map((x, j) => x * weights[i] + acc[j]);
  }, Array(options[0].length).fill(0));
  return {
    "--a": fonts[Math.round(r[0])],
    "--b": `${r[1]}deg`,
    "--c": `${r[2]} ${r[3]}% ${r[4]}%`,
    "--d": `${r[5]}px`,
    "--e": `${r[6]} ${r[7]}% ${r[8]}%`,
    "--f": `${r[9]}px`,
    "--g": `${r[10]}px`,
    "--h": `${r[11]}px`,
    "--i": `${r[12]}px`,
    "--j": `${r[13]}px`,
    "--k": weights[Math.round(r[14])],
    "--l": `${r[15]} ${r[16]}% ${r[17]}%`,
    "--m": `${r[18]}px`,
    "--n": `${r[19]} ${r[20]}% ${r[21]}%`,
    "--o": `${r[22]}px`,
    "--p": borders[Math.round(r[23])],
    "--q": `${r[24]}px`,
    "--r": `${r[25]}px`,
    "--s": `${r[26]}px`,
    "--t": `${r[27]} ${r[28]}% ${r[29]}%`,
    "--u": `${r[30]}px`,
  };
}
