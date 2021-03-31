import "./App.css";
import MultiRange, { useMultiRange } from "./components/MultiRange";
import { borders, fonts, options } from "./components/options";
import { Box } from "./slang";

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

function App() {
  const { weights, componentProps } = useMultiRange({ n: 3 });
  const styles = getStyle(weights);
  return (
    <Box
      className="App"
      template="none / auto minmax(0, 1fr)"
      root
      p={4}
      gap={4}
    >
      <Box>
        <MultiRange size={300} {...componentProps} />
      </Box>
      <Box className="style-pane" content="start normal" style={styles}>
        <h1>Hello World</h1>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Corrupti eius
          vel, dolorem ducimus iusto at provident et. Id temporibus nisi
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
  );
}

export default App;
