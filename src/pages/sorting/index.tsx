import React, { useEffect, useState } from "react";
import {
  DataGrid,
  GridCellParams,
  GridColDef,
  GridValueGetterParams,
} from "@mui/x-data-grid";
import * as d3 from "d3";
import {
  Box,
  Button,
  Card,
  Fab,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import uuid from "uuid-browser/v4";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import NotStartedIcon from "@mui/icons-material/NotStarted";
import Slider from "@mui/material/Slider";

const columns: GridColDef[] = [
  { field: "id", headerName: "Id", editable: false },
  { field: "value", headerName: "Value", editable: true },
  { field: "updated", headerName: "Updated", editable: false },
];

type Row = {
  id: string;
  value: number;
  updated: number;
};

enum SortType {
  "selectionSort" = "Selection Sort",
  "bubbleSort" = "Bubble Sort",
  "quickSort" = "Quick Sort",
  "mergeSort" = "Merge Sort",
}

const useD3 = (renderFunction, dependencies) => {
  const ref = React.useRef();

  React.useEffect(() => {
    renderFunction(d3.select(ref.current));
    return () => {};
  }, dependencies);
  return ref;
};

const Chart = (rows: Row[]) => {
  const ref = useD3(
    (svg) => {
      svg.selectAll("rect").remove();
      svg
        .selectAll("rect")
        .data(rows)
        .enter()
        .append("rect")
        .attr("id", (r: Row) => r.id)
        .attr("x", 0)
        .attr("y", (r: Row, index: number) => index * 2)
        .attr("width", (r: Row) => r.value)
        .attr("height", 1)
        .attr("fill", (row: Row) => {
          const delta = Date.now() - row.updated;
          const s = Math.min(1.0, delta * 0.001);
          const r = 255 - 255 * s;
          const g = 0;
          const b = 0 + 255 * s;
          return `rgb(${r}, ${g}, ${b})`;
        });
    },
    [rows]
  );
  return <svg ref={ref} style={{ width: "100%", height: "500px" }}></svg>;
};

const randomRow = () => {
  return {
    id: uuid(),
    value: Math.round(Math.random() * 1000),
    updated: Date.now(),
  } as Row;
};

function* selectionSortGenerator(rows: Row[]) {
  for (let a = 0; a < rows.length; a++) {
    let lowestValue = rows[a].value;
    let lowestIndex = a;

    for (let b = a + 1; b < rows.length; b++) {
      const r = rows[b];

      if (r.value < lowestValue) {
        lowestValue = r.value;
        lowestIndex = b;
      }
    }

    const swap = rows[a];
    rows[a] = rows[lowestIndex];
    rows[lowestIndex] = swap;
    rows[lowestIndex].updated = rows[a].updated = Date.now();
    yield rows.slice();
  }
}

function* bubbleSortGenerator(rows: Row[]) {
  let loop = true;

  while (loop) {
    loop = false;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i].value < rows[i - 1].value) {
        const swap = rows[i];
        rows[i] = rows[i - 1];
        rows[i - 1] = swap;
        rows[i].updated = rows[i - 1].updated = Date.now();
        loop = true;
        yield rows.slice();
      }
    }
  }
}

const SortingAlgorithms = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [sortType, setSortType] = useState<string>(SortType.selectionSort);
  const [sortGenerator, setSortGenerator] = useState<any>(null);
  const [intervalHandle, setIntervalHandle] = useState<NodeJS.Timer>(null);
  const [intervalDelay, setIntervalDelay] = useState<number>(0);

  return (
    <>
      <h1>Sorting Algorithms</h1>
      <div style={{ height: 400, width: "100%", position: "relative" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={100}
          rowsPerPageOptions={[100]}
          disableSelectionOnClick
          onCellEditCommit={(e) => {
            const newRows = rows.map((r) =>
              r.id === e.id
                ? ({
                    id: e.id,
                    value: Number(e.value),
                    updated: Date.now(),
                  } as Row)
                : r
            );
            setRows(newRows);
          }}
        />
        <Button
          size="small"
          style={{ position: "absolute", bottom: 0, left: 0 }}
          onClick={() => {
            setRows(rows.concat(randomRow()));
          }}
        >
          <AddIcon fontSize="small"></AddIcon>
          <span>Add</span>
        </Button>
      </div>
      <Box display="flex" justifyContent="center" alignItems="center">
        <FormControl disabled={!!sortGenerator} component="fieldset">
          <RadioGroup
            aria-label="sort-type"
            name="radio-buttons-group"
            row
            value={sortType}
            onChange={(e) => {
              setSortType(e.target.value);
            }}
          >
            {Object.entries(SortType).map(([k, v]) => (
              <FormControlLabel
                key={k}
                value={v}
                control={<Radio />}
                label={v}
              />
            ))}
          </RadioGroup>
          <FormControlLabel
            control={
              <Slider
                value={intervalDelay}
                min={0}
                max={1000}
                onChange={(_e, v: number) => setIntervalDelay(v)}
                style={{ width: "200px", margin: "0em 1em 0em 1em" }}
                valueLabelDisplay="auto"
              />
            }
            label="Delay"
          />
        </FormControl>
      </Box>
      <Box
        display={"flex"}
        alignItems={"center"}
        justifyItems={"center"}
        justifyContent={"center"}
      >
        <Button
          disabled={!!sortGenerator}
          onClick={() => {
            const newRows = rows.slice();
            for (let a = 0; a < newRows.length; a++) {
              const b = Math.floor(Math.random() * newRows.length);
              const swap = newRows[a];
              newRows[a] = newRows[b];
              newRows[b] = swap;
            }
            setRows(newRows.slice());
          }}
        >
          <ShuffleIcon fontSize="small"></ShuffleIcon>
          <span>Shuffle</span>
        </Button>
        <Button
          disabled={!!sortGenerator}
          onClick={async () => {
            const gen =
              sortType == SortType.selectionSort
                ? selectionSortGenerator(rows.slice())
                : sortType == SortType.bubbleSort
                ? bubbleSortGenerator(rows.slice())
                : null;
            if (!gen) return;

            clearInterval(intervalHandle);
            setSortGenerator(gen);

            const newIntervalHandle = setInterval(() => {
              console.log("interval");

              const result = gen.next().value;

              if (!result) {
                clearInterval(newIntervalHandle);
                setIntervalHandle(null);
                setSortGenerator(null);
                return;
              }

              setRows(result);
            }, intervalDelay);

            setIntervalHandle(newIntervalHandle);
          }}
        >
          <PlayArrowIcon fontSize="small"></PlayArrowIcon>
          <span>Play</span>
        </Button>
        <Button
          disabled={!sortGenerator}
          onClick={() => {
            clearInterval(intervalHandle);
            setIntervalHandle(null);
            setSortGenerator(null);
          }}
        >
          <StopIcon fontSize="small"></StopIcon>
          <span>Stop</span>
        </Button>
        <Button
          disabled={!intervalHandle}
          onClick={() => {
            clearInterval(intervalHandle);
            setIntervalHandle(null);
          }}
        >
          <PauseIcon fontSize="small"></PauseIcon>
          <span>Pause</span>
        </Button>
        <Button
          disabled={!!intervalHandle || !sortGenerator}
          onClick={() => {
            if (!sortGenerator) return;
            const newIntervalHandle = setInterval(() => {
              console.log("interval");

              const result = sortGenerator.next().value;

              if (!result) {
                clearInterval(newIntervalHandle);
                setIntervalHandle(null);
                setSortGenerator(null);
                return;
              }

              setRows(result);
            }, intervalDelay);

            setIntervalHandle(newIntervalHandle);
          }}
        >
          <PlayCircleIcon fontSize="small"></PlayCircleIcon>
          <span>Unpause</span>
        </Button>
        <Button
          disabled={!sortGenerator}
          onClick={() => {
            if (!sortGenerator) return;

            const result = sortGenerator.next().value;

            if (!result) {
              setSortGenerator(null);
              return;
            }

            setRows(result);
          }}
        >
          <NotStartedIcon fontSize="small"></NotStartedIcon>
          <span>Step</span>
        </Button>
      </Box>
      {Chart(rows)}
    </>
  );
};

export default SortingAlgorithms;
