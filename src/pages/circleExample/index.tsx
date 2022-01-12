import React, { useEffect, useState } from "react";
import Slider from "@mui/material/Slider";
import * as d3 from "d3";

const useD3 = (renderFunction, dependencies) => {
  const ref = React.useRef();

  React.useEffect(() => {
    renderFunction(d3.select(ref.current));
    return () => {};
  }, dependencies);
  return ref;
};

const CircleChart = (
  circleX: number,
  circleY: number,
  circleRadius: number
) => {
  const ref = useD3(
    (svg) => {
      console.log({ circleX, circleY, circleRadius });
      svg
        .select("circle")
        .attr("cx", circleX)
        .attr("cy", circleY)
        .attr("r", circleRadius);
    },
    [circleX, circleY, circleRadius]
  );
  return (
    <svg ref={ref} style={{ width: "100%", height: "500px" }}>
      <circle></circle>
    </svg>
  );
};

const CircleExample = () => {
  const [circleRadius, setRadius] = useState(50);
  const [circleX, setX] = useState(50);
  const [circleY, setY] = useState(50);

  return (
    <>
      <h1>CircleExample</h1>
      <Slider
        size="small"
        min={0}
        max={100}
        value={circleX}
        valueLabelDisplay="auto"
        onChange={(_e, v: number) => setX(v)}
      />
      <Slider
        size="small"
        min={0}
        max={100}
        value={circleY}
        valueLabelDisplay="auto"
        onChange={(_e, v: number) => setY(v)}
      />
      <Slider
        size="small"
        min={0}
        max={100}
        value={circleRadius}
        valueLabelDisplay="auto"
        onChange={(_e, v: number) => setRadius(v)}
      />
      {CircleChart(circleX, circleY, circleRadius)}
    </>
  );
};

export default CircleExample;
