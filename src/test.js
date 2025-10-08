import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip as LeafletTooltip } from "react-leaflet";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Waste Weight Function
const getWasteWeight = (quantity) => {
  switch (quantity) {
    case "below_500_kg":
      return 3.5;
    case "some_100_kg":
      return 1;
    case "_500kg_1_tonne":
      return 7.5;
    case "above_1_tonne":
      return 10;
    default:
      return 0;
  }
};

// Waste Type Map
const wasteTypeToColumnMap = {
  "Organic & Wet": "Organic and Wet Waste",
  "Plastic Paper": "Plastic Paper Glass Waste",
  "Sanitary & Hazardous": "Sanitary and Hazardous Waste",
  "Battery & Bulb": "Battery and Bulb Waste",
  "Construction & Demolition": "Construction and Demolition Waste",
  Clothes: "Clothes Waste",
  Carcasses: "Carcasses Waste",
  Others: "Others",
};

// Calculate Pie Data
const calculateWasteTypeCounts = (data) => {
  const counts = {};
  Object.keys(wasteTypeToColumnMap).forEach((type) => (counts[type] = 0));

  data.forEach((row) => {
    Object.entries(wasteTypeToColumnMap).forEach(([type, column]) => {
      if (row[column] === 1) counts[type] += 1;
    });
  });

  return Object.keys(counts)
    .filter((key) => counts[key] > 0)
    .map((key) => ({ name: key, value: counts[key] }));
};

// Calculate Pie Data for single row
const calculatePieForRow = (row) => {
  return Object.entries(wasteTypeToColumnMap)
    .filter(([type, column]) => row[column] === 1)
    .map(([type]) => ({ name: type, value: 1 }));
};

// Custom Labels for Pie
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  fill,
  name,
  percent,
}) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const textAnchor = x > cx ? "start" : "end";
  const labelX = x + (x > cx ? 5 : -5);
  const percentage = (percent * 100).toFixed(0);

  if (percentage < 3) return null;

  return (
    <g>
      <polyline
        points={[
          [
            cx + outerRadius * Math.cos(-midAngle * RADIAN),
            cy + outerRadius * Math.sin(-midAngle * RADIAN),
          ],
          [x, y],
          [labelX, y],
        ]
          .map((p) => p.join(","))
          .join(" ")}
        stroke={fill}
        fill="none"
        strokeWidth={1}
      />
      <text
        x={labelX}
        y={y - 5}
        fill="#333"
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{ fontSize: "12px", fontWeight: "bold" }}
      >
        {`${percentage}%`}
      </text>
      <text
        x={labelX}
        y={y + 10}
        fill="#666"
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{ fontSize: "11px" }}
      >
        {name}
      </text>
    </g>
  );
};

// ✅ Tooltip Function (Full Measure)
const getGarbagePointInfo = (row) => {
  const LB = "\n";

  // ===============================
  // SECTION 1: 🟢 GVP Information
  // ===============================
  const Ward = row["GVP Ward"] ? `𝗪𝗮𝗿𝗱: ${row["GVP Ward"]}${LB}` : "";

  const NearestLocationRaw = row["Nearest Location"];
  const NearestLocation = NearestLocationRaw
    ? `𝗡𝗲𝗮𝗿𝗲𝘀𝘁 𝗟𝗼𝗰𝗮𝘁𝗶𝗼𝗻: ${NearestLocationRaw.replace(/\r|\n/g, " ").trim()}${LB}`
    : "";

  const Comments = row["Comments On GVP"]
    ? `𝗖𝗼𝗺𝗺𝗲𝗻𝘁𝘀: ${row["Comments On GVP"]}${LB}`
    : "";

  const wasteTypesMap = {
    "Organic and Wet Waste": "• Organic and Wet Waste",
    "Plastic Paper Glass Waste": "• Plastic Paper Glass Waste",
    "Sanitary and Hazardous Waste": "• Sanitary and Hazardous Waste",
    "Battery and Bulb Waste": "• Battery and Bulb Waste",
    "Construction and Demolition Waste": "• Construction and Demolition Waste",
    "Clothes Waste": "• Clothes Waste",
    "Carcasses Waste": "• Carcasses Waste",
    Others: "• Others",
  };

  const WasteTypes = Object.keys(wasteTypesMap)
    .filter((k) => row[k] === 1 || row[k] === true)
    .map((k) => wasteTypesMap[k])
    .join(LB);

  const OtherWaste = row["Other Waste Found"]
    ? `• ${row["Other Waste Found"]}`
    : "";

  const WasteTypeSection =
    WasteTypes || OtherWaste
      ? `𝗪𝗮𝘀𝘁𝗲 𝗧𝘆𝗽𝗲:${LB}${WasteTypes}${WasteTypes && OtherWaste ? LB : ""}${OtherWaste}${LB}`
      : "";

  const WasteQty = row["Waste Quantity Numeric"]
    ? `𝗪𝗮𝘀𝘁𝗲 𝗩𝗼𝗹𝘂𝗺𝗲: ${row["Waste Quantity Numeric"]}${LB}`
    : "";

  const Setting = row["In_what_setting_is_the_GVP_pre"]
    ? `𝗜𝗻 𝗪𝗵𝗮𝘁 𝗦𝗲𝘁𝘁𝗶𝗻𝗴 𝗶𝘀 𝗚𝗩𝗣 𝗣𝗿𝗲𝘀𝗲𝗻𝘁: ${row["In_what_setting_is_the_GVP_pre"]}${LB}`
    : "";

  const Area = row["Kindly_specify_the_area"]
    ? `𝗔𝗿𝗲𝗮: ${row["Kindly_specify_the_area"]}${LB}`
    : "";

  const Section_GVP_Body =
    Ward + NearestLocation + Comments + WasteTypeSection + WasteQty + Setting + Area;

  const Section_GVP = Section_GVP_Body
    ? `🟢 𝗚𝗩𝗣 𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻${LB}${Section_GVP_Body}`
    : "";

  // ===================================
  // SECTION 2: 🔵 Interaction Information
  // ===================================
  const CivicSession = row["Civic Authority Conduct Any Session"]
    ? `𝗛𝗮𝘀 𝗧𝗵𝗲 𝗖𝗶𝘃𝗶𝗰 𝗔𝘂𝘁𝗵𝗼𝗿𝗶𝘁𝘆 𝗖𝗼𝗻𝗱𝘂𝗰𝘁𝗲𝗱 𝗔𝗻𝘆 𝗔𝘄𝗮𝗿𝗲𝗻𝗲𝘀𝘀 𝗦𝗲𝘀𝘀𝗶𝗼𝗻: ${row["Civic Authority Conduct Any Session"]}${LB}`
    : "";

  const Complained = row["Have Interviewees Complained to Authority"]
    ? `𝗛𝗮𝘃𝗲 𝗜𝗻𝘁𝗲𝗿𝘃𝗶𝗲𝘄𝗲𝗲𝘀 𝗖𝗼𝗺𝗽𝗹𝗮𝗶𝗻𝗲𝗱 𝘁𝗼 𝗔𝘂𝘁𝗵𝗼𝗿𝗶𝘁𝗶𝗲𝘀: ${row["Have Interviewees Complained to Authority"]}${LB}`
    : "";

  const Experience = row["If Yes How Was Your Experience "]
    ? `𝗜𝗳 𝗬𝗲𝘀 𝗛𝗼𝘄 𝗪𝗮𝘀 𝗬𝗼𝘂𝗿 𝗘𝘅𝗽𝗲𝗿𝗶𝗲𝗻𝗰𝗲: ${row["If Yes How Was Your Experience "]}${LB}`
    : "";

  const NoticeFreq = row["Notice Frequency"]
    ? `𝗛𝗼𝘄 𝗢𝗳𝘁𝗲𝗻 𝗶𝘀 𝗪𝗮𝘀𝘁𝗲 𝗦𝗽𝗼𝘁𝘁𝗲𝗱: ${row["Notice Frequency"]}${LB}`
    : "";

  const Solution = row["Solution Suggested by Interviewee"]
    ? `𝗦𝗼𝗹𝘂𝘁𝗶𝗼𝗻 𝗦𝘂𝗴𝗴𝗲𝘀𝘁𝗲𝗱 𝗕𝘆 𝗜𝗻𝘁𝗲𝗿𝘃𝗶𝗲𝘄𝗲𝗲: ${row["Solution Suggested by Interviewee"]}${LB}`
    : "";

  const DisposeWhere = row["Where Interviewee Dispose Their Waste"]
    ? `𝗪𝗵𝗲𝗿𝗲 𝗜𝗻𝘁𝗲𝗿𝘃𝗶𝗲𝘄𝗲𝗲 𝗗𝗶𝘀𝗽𝗼𝘀𝗲𝘀 𝗧𝗵𝗲𝗶𝗿 𝗪𝗮𝘀𝘁𝗲: ${row["Where Interviewee Dispose Their Waste"]}${LB}`
    : "";

  const WhoDispose = row["Who Dispose"]
    ? `𝗪𝗵𝗼 𝗗𝗶𝘀𝗽𝗼𝘀𝗲𝘀 𝗧𝗵𝗲 𝗪𝗮𝘀𝘁𝗲: ${row["Who Dispose"]}${LB}`
    : "";

  const GenderWomen = row["No of Women"];
  const GenderMen = row["No of Men"];
  const GenderBlock =
    GenderWomen || GenderMen
      ? `𝗚𝗲𝗻𝗱𝗲𝗿:${LB}${
          GenderWomen ? `• Women: ${GenderWomen}${LB}` : ""
        }${GenderMen ? `• Men: ${GenderMen}${LB}` : ""}`
      : "";

  const wasteReasonsMap = {
    "No Regular Collection Vehicle": "• No Regular Collection Vehicle",
    "Random People Throwing Garbage": "• Random People Throwing Garbage",
    "Due to User fee": "• Due to User fee",
    "Mismatch of Vehicle Time": "• Mismatch of Vehicle Time",
    "Due to Narrow Road": "• Due to Narrow Road",
    "Because of Market and Street Vendors":
      "• Because of Market and Street Vendors",
  };

  const WasteReasons = Object.keys(wasteReasonsMap)
    .filter((k) => row[k] === 1 || row[k] === true)
    .map((k) => wasteReasonsMap[k])
    .join(LB);

  const WasteReasonsSection = WasteReasons
    ? `𝗥𝗲𝗮𝘀𝗼𝗻𝘀 𝗳𝗼𝗿 𝗪𝗮𝘀𝘁𝗲 𝗔𝗰𝗰𝘂𝗺𝘂𝗹𝗮𝘁𝗶𝗼𝗻:${LB}${WasteReasons}${LB}`
    : "";

  const WasteClear = row["Does Waste Clear Off"]
    ? `𝗗𝗼𝗲𝘀 𝗪𝗮𝘀𝘁𝗲 𝗚𝗲𝘁 𝗖𝗹𝗲𝗮𝗿𝗲𝗱 𝗢𝗳𝗳: ${row["Does Waste Clear Off"]}${LB}`
    : "";

  const WasteClearWhen = row["When Waste Cleared Off"]
    ? `𝗪𝗵𝗲𝗻 𝗪𝗮𝘀𝘁𝗲 𝗖𝗹𝗲𝗮𝗿𝗲𝗱 𝗢𝗳𝗳: ${row["When Waste Cleared Off"]}${LB}`
    : "";

  const problemsMap = {
    "Bad Odour": "• Bad Odour",
    Mosquitos: "• Mosquitos",
    "Stray Animals": "• Stray Animals",
    Congestion: "• Congestion",
    Other: "• Other",
  };

  const ProblemsFlags = Object.keys(problemsMap)
    .filter((k) => row[k] === 1 || row[k] === true)
    .map((k) => problemsMap[k])
    .join(LB);

  const OtherProblemText = row["Other Problem Face"];
  const ProblemsCombined =
    ProblemsFlags && OtherProblemText
      ? ProblemsFlags + LB + `• ${OtherProblemText}`
      : ProblemsFlags || (OtherProblemText ? `• ${OtherProblemText}` : "");

  const ProblemsSection = ProblemsCombined
    ? `𝗣𝗿𝗼𝗯𝗹𝗲𝗺𝘀 𝗙𝗮𝗰𝗲𝗱:${LB}${ProblemsCombined}${LB}`
    : "";

  const Section_Interaction_Body =
    CivicSession +
    Complained +
    Experience +
    NoticeFreq +
    Solution +
    DisposeWhere +
    WhoDispose +
    GenderBlock +
    WasteReasonsSection +
    WasteClear +
    WasteClearWhen +
    ProblemsSection;

  const Section_Interaction = Section_Interaction_Body
    ? `🔵 𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻 𝗦𝗵𝗮𝗿𝗲𝗱 𝗯𝘆 𝗖𝗶𝘁𝗶𝘇𝗲𝗻𝘀${LB}${Section_Interaction_Body}`
    : "";

  // Final return
  return [Section_GVP, Section_Interaction].filter(Boolean).join(LB + LB);
};

// DataTable Component
const DataTable = ({ data, onRowClick, selectedRowIndex }) => {
  const tableData = data.filter((row) => row["Type_of_Form"] === "form_for_gvp");

  const rowColors = [
    "#FFEBEE",
    "#FFF3E0",
    "#FFF9C4",
    "#E8F5E9",
    "#E3F2FD",
    "#F3E5F5",
    "#ECEFF1",
    "#FFFDE7",
  ];

  if (tableData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg text-center mt-6">
        <p className="text-gray-500 italic">
          No Garbage Points found for the current filter.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-full h-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Photos and Videos of Garbage Points
      </h2>
      <div className="overflow-y-auto h-[420px]">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                GVP Ward
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Nearest Location
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Photo URL
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Video URL
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.slice(0, 50).map((row, index) => {
              const isSelected = selectedRowIndex === index;
              return (
                <tr
                  key={index}
                  className="hover:bg-yellow-50/50 transition duration-150 cursor-pointer"
                  style={{
                    height: "40px",
                    backgroundColor: isSelected
                      ? "#FFD54F"
                      : rowColors[index % rowColors.length],
                  }}
                  onClick={() => onRowClick(index)}
                >
                  <td className="px-4 text-sm font-medium text-gray-900">
                    {row["GVP Ward"] || "N/A"}
                  </td>
                  <td className="px-4 text-sm text-gray-700">
                    {row["Nearest Location"] || "N/A"}
                  </td>
                  <td className="px-4 text-sm text-blue-600 hover:text-blue-800">
                    {row["Photo URL"] ? (
                      <a
                        href={row["Photo URL"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Photo
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-4 text-sm text-blue-600 hover:text-blue-800">
                    {row["Video URL"] ? (
                      <a
                        href={row["Video URL"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Video
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Colors for pie chart
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A020F0",
  "#DC143C",
  "#2E8B57",
  "#808080",
];

// Card size classes
const CARD_SIZE_CLASSES = "w-[250px] h-32";

function App() {
  const [allData, setAllData] = useState([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);

  useEffect(() => {
    fetch("/data_cleaned.json")
      .then((res) => res.json())
      .then((json) => setAllData(json));
  }, []);

  const handleRowClick = (rowIndex) => {
    if (selectedRowIndex === rowIndex) {
      setSelectedRowIndex(null); // unselect
    } else {
      setSelectedRowIndex(rowIndex);
    }
  };

  const tableData = allData.filter((row) => row["Type_of_Form"] === "form_for_gvp");

  const selectedRow = selectedRowIndex !== null ? tableData[selectedRowIndex] : null;

  // when selectedRow changes, pan/zoom map to it (if map available)
  useEffect(() => {
    if (mapInstance && selectedRow) {
      const lat = Number(selectedRow["GVP Latitude"]);
      const lng = Number(selectedRow["GVP Longitude"]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        try {
          // smoothly pan & zoom a bit (zoom 14)
          mapInstance.flyTo([lat, lng], Math.max(mapInstance.getZoom(), 14), {
            animate: true,
            duration: 0.6,
          });
        } catch (e) {
          // ignore if map not ready
        }
      }
    }
    // if unselected, do nothing (keeps the current map view)
  }, [selectedRow, mapInstance]);

  // Cards
  const filteredDataForCards = selectedRow ? [selectedRow] : tableData;

  const totalGarbagePoints = filteredDataForCards.length;

  const totalHathGadiVolume = filteredDataForCards.reduce((sum, row) => {
    const quantity = row["Approx Waste Quantity Found at GVP"];
    const weight = getWasteWeight(quantity);
    return sum + weight;
  }, 0);

  // Pie chart data
  const pieData = selectedRow
    ? calculatePieForRow(selectedRow)
    : calculateWasteTypeCounts(tableData);

  const mapCenter = [21.1458, 79.0882];

  // Called when marker clicked -> select corresponding table row and center map
  const handleMarkerClick = (row) => {
    // find index in tableData by a robust stable key (lat-lng-ward)
    const keyOfRow = `${row["GVP Latitude"]}-${row["GVP Longitude"]}-${row["GVP Ward"]}`;
    const idx = tableData.findIndex(
      (r) => `${r["GVP Latitude"]}-${r["GVP Longitude"]}-${r["GVP Ward"]}` === keyOfRow
    );
    if (idx !== -1) {
      setSelectedRowIndex(idx);
      // center map too (immediate)
      if (mapInstance) {
        const lat = Number(row["GVP Latitude"]);
        const lng = Number(row["GVP Longitude"]);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          try {
            mapInstance.flyTo([lat, lng], 15, { animate: true, duration: 0.5 });
          } catch (e) {}
        }
      }
    }
  };

  // zoom button inside tooltip
  const handleZoomToMarker = (row, e) => {
    e?.stopPropagation();
    if (mapInstance) {
      const lat = Number(row["GVP Latitude"]);
      const lng = Number(row["GVP Longitude"]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        try {
          mapInstance.setView([lat, lng], 16);
        } catch (err) {}
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-100 min-h-screen font-sans">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
        Nagpur Garbage Dashboard
      </h1>

      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        {/* Left column */}
        <div className="flex flex-col gap-4 w-[450px]">
          {/* Cards */}
          <div className="flex flex-row flex-nowrap gap-4 overflow-x-auto pb-2">
            <div
              className={`bg-white p-4 rounded-lg shadow-lg text-center border-b-4 border-yellow-500 flex flex-col justify-center ${CARD_SIZE_CLASSES}`}
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Total Garbage Points
              </h2>
              <p className="text-5xl font-extrabold mt-1 text-gray-900">
                {totalGarbagePoints}
              </p>
            </div>

            <div
              className={`bg-white p-4 rounded-lg shadow-lg text-center border-b-4 border-green-500 flex flex-col justify-center ${CARD_SIZE_CLASSES}`}
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                GVP Waste Volume (Hath Gadi)
              </h2>
              <p className="text-5xl font-extrabold mt-1 text-gray-900">
                {Math.round(totalHathGadiVolume)}
              </p>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 text-center mb-4">
              Breakdown by Waste Type
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={60}
                  label={renderCustomizedLabel}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* DataTable */}
          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 h-[500px]">
            <DataTable
              data={allData}
              onRowClick={handleRowClick}
              selectedRowIndex={selectedRowIndex}
            />
          </div>
        </div>

        {/* Right column - Map */}
        <div className="flex-1 h-[600px]">
          <MapContainer
            whenCreated={(map) => setMapInstance(map)}
            center={mapCenter}
            zoom={12}
            className="w-full h-full rounded-lg shadow-lg border border-gray-200"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {(selectedRow ? [selectedRow] : tableData)
              .filter((row) => row["GVP Latitude"] && row["GVP Longitude"])
              .map((row, idx) => {
                // use a stable key composed from ward + lat + lng (+ idx fallback)
                const lat = Number(row["GVP Latitude"]);
                const lng = Number(row["GVP Longitude"]);
                const ward = row["GVP Ward"] || "";
                const stableKey = `${ward}-${lat}-${lng}-${idx}`;

                return (
                 <Marker
  key={stableKey}
  position={[lat, lng]}
  eventHandlers={{
    click: () => {
      // Toggle selection when marker is clicked
      if (selectedRowIndex === row.id) {
        setSelectedRowIndex(null); // deselect if already selected
      } else {
        setSelectedRowIndex(row.id); // select if not selected
      }
    },
  }}
>
  <LeafletTooltip
    direction="top"
    offset={[0, -10]}
    opacity={1}
    sticky={true}
    className="rounded shadow-lg p-0"
  >
    <div
      style={{
        maxWidth: 560,
        whiteSpace: "pre-wrap",
        fontSize: 13,
        lineHeight: 1.35,
        padding: 10,
        background: "white",
        borderRadius: 8,
        boxShadow: "0 6px 18px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ marginBottom: 8, fontWeight: 700 }}>
        Garbage Point Info
      </div>
      <div style={{ marginBottom: 8 }}>
        {getGarbagePointInfo(row)}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Toggle selection on button click too
            if (selectedRowIndex === row.id) {
              setSelectedRowIndex(null);
            } else {
              setSelectedRowIndex(row.id);
            }
          }}
          className="px-2 py-1 text-sm rounded border"
          style={{
            cursor: "pointer",
            background: "#f3f4f6",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
          }}
        >
          {selectedRowIndex === row.id ? "Deselect Row" : "Select Row"}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomToMarker(row, e);
          }}
          className="px-2 py-1 text-sm rounded border"
          style={{
            cursor: "pointer",
            background: "#e0f2fe",
            borderRadius: 6,
            border: "1px solid #bae6fd",
          }}
        >
          Zoom to marker
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRowIndex(null); // clear selection
          }}
          className="px-2 py-1 text-sm rounded border"
          style={{
            cursor: "pointer",
            background: "#fff1f2",
            borderRadius: 6,
            border: "1px solid #fecaca",
          }}
        >
          Clear selection
        </button>
      </div>
    </div>
  </LeafletTooltip>
</Marker>

                );
              })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
