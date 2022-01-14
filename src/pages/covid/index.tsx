import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Slider,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import * as d3 from "d3";
import Papa from "papaparse";
import React from "react";
import { useEffect, useRef, useState } from "react";
import uuid from "uuid-browser/v4";
import { addDays, isEqual, differenceInCalendarDays, isValid } from "date-fns";

enum ProjectionMode {
  geoAlbers = "Geo Albers",
  geoAzimuthalEquidistant = "Geo Azimuthal Equidistant",
  geoNaturalEarth1 = "Geo Natural Earth 1",
  geoOrthographic = "Geo Orthographic",
  geoStereographic = "Geo Stereographic",
  geoConicConformal = "Geo Conic Conformal",
  geoConicEqualArea = "Geo Conic Equal Area",
  geoGnomonic = "Geo Gnomonic",
  geoEqualEarth = "Geo Equal Earth",
  geoEquirectangular = "Geo Equirectangular",
  geoMercator = "Geo Mercator",
  geoTransverseMercator = "Geo Transverse Mercator",
}

const loadText = (url: string) => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onreadystatechange = function () {
      if (request.readyState == 4) {
        if (request.status !== 200) {
          reject(request.response);
        }

        resolve(request.response);
      }
    };
    request.send(null);
  }) as Promise<string>;
};

const columns: GridColDef[] = [
  { field: "id", headerName: "Id" },
  {
    field: "date",
    headerName: "Date",
    width: 200,
    renderCell: (params) => {
      const d = params.value as Date;
      return d.toDateString();
    },
  },
  { field: "cases", headerName: "Cases" },
  { field: "deaths", headerName: "Deaths" },
  { field: "countryName", headerName: "Name" },
  { field: "countryCode", headerName: "Code" },
  { field: "continent", headerName: "Continent" },
];

type CovidRow = {
  id: string;
  date: Date;
  cases: number;
  deaths: number;
  countryName: string;
  countryCode: string;
  continent: string;
};

type Args = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  projectionMode: ProjectionMode;
  worldTransform: any;
  minDate: number;
  dayOffset: number;
  covidData: CovidRow[];
  worldData: any;
};

type GeoFeature = {
  type: "Feature";
  properties: { name: string };
  geometry: { type: "Polygon"; coordinates: any };
  id: string;
};

const renderFunction = (args: Args) => {
  console.log("renderFunction");

  if (!args?.worldData?.features || !args?.covidData) return;

  const svg = d3.select("svg#svg");
  const viewDay = addDays(new Date(args.minDate), args.dayOffset);
  const cases = args.covidData.map((r) => r.cases);
  const maxCases = Math.max(...cases);
  const lookupData = args.covidData.reduce((a, c) => {
    const pastData = a[c.countryCode];

    if (!pastData) {
      a[c.countryCode] = c;
    } else {
      const pastDiff = Math.abs(
        differenceInCalendarDays(pastData.date, viewDay)
      );
      const currDiff = Math.abs(differenceInCalendarDays(c.date, viewDay));

      if (currDiff < pastDiff) {
        a[c.countryCode] = c;
      }
    }

    return a;
  }, {} as { [countryCode: string]: CovidRow });

  const projection =
    args.projectionMode === ProjectionMode.geoAlbers
      ? d3.geoAlbers()
      : args.projectionMode === ProjectionMode.geoAzimuthalEquidistant
      ? d3.geoAzimuthalEquidistant()
      : args.projectionMode === ProjectionMode.geoNaturalEarth1
      ? d3.geoNaturalEarth1()
      : args.projectionMode === ProjectionMode.geoOrthographic
      ? d3.geoOrthographic()
      : args.projectionMode === ProjectionMode.geoStereographic
      ? d3.geoStereographic()
      : args.projectionMode === ProjectionMode.geoConicConformal
      ? d3.geoConicConformal()
      : args.projectionMode === ProjectionMode.geoConicEqualArea
      ? d3.geoConicEqualArea()
      : args.projectionMode === ProjectionMode.geoGnomonic
      ? d3.geoGnomonic()
      : args.projectionMode === ProjectionMode.geoEqualEarth
      ? d3.geoEqualEarth()
      : args.projectionMode === ProjectionMode.geoEquirectangular
      ? d3.geoEquirectangular()
      : args.projectionMode === ProjectionMode.geoMercator
      ? d3.geoMercator()
      : args.projectionMode === ProjectionMode.geoTransverseMercator
      ? d3.geoTransverseMercator()
      : null;

  if (!projection) throw "unsupported projectionType";

  projection.rotate([args.centerX, args.centerY]);

  let scale = 100;
  if (args.worldTransform) {
    scale = args.worldTransform.k * 100;
  }

  projection.scale(scale);

  svg.selectAll("g").remove();

  svg
    .append("g")
    .attr("id", "world")
    .selectAll("path")
    .data(args.worldData.features)
    .enter()
    .append("path")
    .attr("fill", function (feature: GeoFeature) {
      const match = lookupData[feature.id];
      if (!match) return "gray";
      return d3.interpolateRgb(
        "gray",
        "red"
      )(Math.min(1.0, (1000.0 * match.cases) / maxCases));
    })
    .attr("d", d3.geoPath().projection(projection))
    .style("stroke", "black")
    .style("opacity", 0.3)
    .append("title")
    .text(function (feature: GeoFeature) {
      return `${
        feature.properties.name
      } - ${feature.id}${lookupData[feature.id] ? `\nCases: ${lookupData[feature.id].cases}` : ""}`;
    });

  const dragBehavior = d3
    .drag()
    .on("start", (e) => {})
    .on("end", (e) => {})
    .on("drag", (e) => {
      args.centerX += e.dx * 0.1;
      args.centerY -= e.dy * 0.1;
      window.requestAnimationFrame(() => {
        renderFunction(args);
      });
    });

  const zoomBehavior = d3.zoom().on("zoom", (e) => {
    args.worldTransform = e.transform;
    window.requestAnimationFrame(() => {
      renderFunction(args);
    });
  });

  svg.call(dragBehavior).call(zoomBehavior);
};

const CovidChart = (args: Args) => {
  console.log("CovidChart");
  const ref = useRef();

  useEffect(() => {
    window.requestAnimationFrame(() => {
      renderFunction(args);
    });
  }, [args]);

  return <svg id="svg" ref={ref} width={args.width} height={args.height}></svg>;
};

const loadCovidData = async () => {
  const csv = await loadText("covid/dailyData.csv");
  const papaResult = Papa.parse(csv);
  const data = [];

  for (let i = 1; i < papaResult.data.length; i++) {
    const [
      dateRep,
      day,
      month,
      year,
      cases,
      deaths,
      countriesAndTerritories,
      geoId,
      countryterritoryCode,
      popData2020,
      continentExp,
    ] = papaResult.data[i] as any[];

    const row = {
      id: uuid(),
      date: new Date(year, month - 1, day),
      cases: Number(cases),
      deaths: Number(deaths),
      countryCode: countryterritoryCode,
      countryName: countriesAndTerritories,
      continent: continentExp,
    } as CovidRow;

    if (!isValid(row.date) || row.cases < 0) continue;

    data.push(row);
  }

  return data;
};

const loadWorldData = async () => {
  const worldText = await loadText("covid/world.geojson");
  return JSON.parse(worldText);
};

const CovidPage = () => {
  const [covidData, setCovidData] = useState<CovidRow[]>([]);
  const [worldData, setWorldData] = useState<any>(null);
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>(
    ProjectionMode.geoOrthographic
  );

  const dates = covidData.map((r) => r.date.valueOf());
  let minDate = Date.now();
  let maxDate = Date.now();
  let dayDiff = 0;

  if (dates.length > 0) {
    minDate = Math.min(...dates);
    maxDate = Math.max(...dates);
    dayDiff = differenceInCalendarDays(maxDate, minDate);
  }

  useEffect(() => {
    loadCovidData().then(setCovidData);
    loadWorldData().then(setWorldData);
  }, []);

  const args = {
    width: 1024,
    height: 1024,
    centerX: 0,
    centerY: 100,
    projectionMode: projectionMode,
    worldTransform: null,
    minDate,
    dayOffset: 0,
    worldData,
    covidData,
  } as Args;

  return (
    <>
      <Box padding={"1em"}>
        <h1>Covid Chart</h1>
        <h2>Sources:</h2>
        <ul>
          <li>
            <a href="https://www.ecdc.europa.eu/en/covid-19/data">
              https://www.ecdc.europa.eu/en/covid-19/data
            </a>
          </li>
          <li>
            <a href="https://www.npmjs.com/package/d3-geo-projection">
              https://www.npmjs.com/package/d3-geo-projection
            </a>
          </li>
        </ul>
      </Box>
      <Box height={500}>
        <DataGrid
          rows={covidData}
          columns={columns}
          pageSize={100}
          rowsPerPageOptions={[100]}
          disableSelectionOnClick
        />
      </Box>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        padding={"1em"}
      >
        <FormControl component="fieldset">
          <RadioGroup
            name="radio-buttons-group"
            row
            value={projectionMode}
            onChange={(e) => {
              setProjectionMode(e.target.value as ProjectionMode);
            }}
          >
            {Object.entries(ProjectionMode).map(([k, v]) => (
              <FormControlLabel
                key={v}
                value={v}
                control={<Radio />}
                label={v}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>
      <Box padding={"1em"}>
        <Slider
          min={0}
          max={dayDiff}
          valueLabelFormat={(v) => {
            return addDays(minDate, v).toDateString();
          }}
          valueLabelDisplay="on"
          onChange={(e, v) => {
            window.requestAnimationFrame(() => {
              args.dayOffset = v as number;
              renderFunction(args);
            });
          }}
        ></Slider>
      </Box>
      {CovidChart(args)}
    </>
  );
};

export default CovidPage;
