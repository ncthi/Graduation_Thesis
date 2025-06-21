import { useState, useEffect, useMemo } from "react";
import axiosRequest from "../config/axios.config";
import { timestampToDate } from "../config/timestamp.config";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart} from "recharts";
import { FaCalendarAlt, FaChartPie, FaChartBar, FaMapMarkerAlt, FaImage, FaCalendarDay, FaDownload, FaSyncAlt} from "react-icons/fa";

type ImageItem = {
  filename: string;
  metadata?: {
    Prediction?: string;
    Location?: string;
  };
};
interface DailyAnalysisItem {
  date: string;
  [key: string]: number | string;
}

type DashboardStats = {
  totalImages: number;
  asphaltbadCount: number;
  pavedbadCount: number;
  unpavedbadCount: number;
  rainCount: number;
  imagesWithLocation: number;
  imagesWithoutLocation: number;
  averageImagesPerDay: number;
  mostActiveDay: {
    date: string;
    count: number;
  };
};

const BAR_COLORS = {
  "Asphalt bad": "#EF4444",
  "Paved bad": "#F59E0B",
  "Unpaved bad": "#8B5CF6",
  Rain: "#3B82F6",
};

const extractDatePart = (vietnameseDateString: string): string => {
  if (!vietnameseDateString || vietnameseDateString === "Unknown") return "";

  const parts = vietnameseDateString.split(" ");
  if (parts.length < 2) return "";

  const datePart = parts[1];
  const [day, month, year] = datePart.split("/");
  return `${year}-${month}-${day}`;
};

const isDateInRange = (
  dateStr: string,
  start: string,
  end: string
): boolean => {
  if (!start || !end || !dateStr) return true;

  const isoDate = extractDatePart(dateStr);
  return isoDate >= start && isoDate <= end;
};

export default function Dashboard() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [filterPrediction, setFilterPrediction] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Fetch images
  useEffect(() => {
    async function fetchImages() {
      setLoading(true);
      try {
        const res = await axiosRequest.get("list-images/");
        const imageData = res.data?.images;

        if (Array.isArray(imageData)) {
          setImages(imageData);

          // Set initial date range based on available data
          if (imageData.length > 0) {
            const dates = imageData
              .map((img: ImageItem) => {
                const fullDate = timestampToDate(img.filename);
                return extractDatePart(fullDate);
              })
              .filter((date: string) => date !== "");

            if (dates.length > 0) {
              dates.sort();
              setDateRange({
                start: dates[0],
                end: dates[dates.length - 1],
              });
            }
          }
        } else {
          console.warn("API trả về images không hợp lệ:", res.data);
          setImages([]);
        }
      } catch (error) {
        console.error("Error loading image data:", error);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchImages();
  }, [refreshTrigger]);

  // Filter images based on date range and prediction
  const filteredImages = useMemo(() => {
    if (!Array.isArray(images)) return [];

    return images.filter((img) => {
      const fullDate = timestampToDate(img.filename);

      const inDateRange = isDateInRange(
        fullDate,
        dateRange.start,
        dateRange.end
      );

      const matchesPrediction =
        !filterPrediction ||
        img.metadata?.Prediction?.toLowerCase() ===
          filterPrediction.toLowerCase();

      return inDateRange && matchesPrediction;
    });
  }, [images, dateRange, filterPrediction]);

  // Calculate dashboard statistics
  const stats: DashboardStats = useMemo(() => {
    const defaultStats: DashboardStats = {
      totalImages: 0,
      asphaltbadCount: 0,
      pavedbadCount: 0,
      unpavedbadCount: 0,
      rainCount: 0,
      imagesWithLocation: 0,
      imagesWithoutLocation: 0,
      averageImagesPerDay: 0,
      mostActiveDay: {
        date: "-",
        count: 0,
      },
    };

    if (!filteredImages.length) return defaultStats;

    // Count by date
    const dateCount: Record<string, number> = {};
    filteredImages.forEach((img) => {
      const fullDate = timestampToDate(img.filename);
      const date = extractDatePart(fullDate);
      if (date !== "") {
        dateCount[date] = (dateCount[date] || 0) + 1;
      }
    });

    // Find most active day
    let mostActiveDay = { date: "-", count: 0 };
    Object.entries(dateCount).forEach(([date, count]) => {
      if (count > mostActiveDay.count) {
        mostActiveDay = { date, count };
      }
    });

    // Count unique days with images
    const uniqueDays = Object.keys(dateCount).length;

    return {
      totalImages: filteredImages.length,
      asphaltbadCount: filteredImages.filter(
        (img) => img.metadata?.Prediction === "Asphalt bad"
      ).length,
      pavedbadCount: filteredImages.filter(
        (img) => img.metadata?.Prediction === "Paved bad"
      ).length,
      unpavedbadCount: filteredImages.filter(
        (img) => img.metadata?.Prediction === "Unpaved bad"
      ).length,
      rainCount: filteredImages.filter(
        (img) => img.metadata?.Prediction === "Rain"
      ).length,
      imagesWithLocation: filteredImages.filter(
        (img) => !!img.metadata?.Location
      ).length,
      imagesWithoutLocation: filteredImages.filter(
        (img) => !img.metadata?.Location
      ).length,
      averageImagesPerDay: uniqueDays
        ? +(filteredImages.length / uniqueDays).toFixed(1)
        : 0,
      mostActiveDay,
    };
  }, [filteredImages]);

  // Prepare data for charts
  const chartData = useMemo(() => {
    const imagesByDate: Record<string, { date: string; count: number }> = {};

    filteredImages.forEach((img) => {
      const fullDate = timestampToDate(img.filename);
      const date = extractDatePart(fullDate);
      if (date === "") return;

      if (!imagesByDate[date]) {
        imagesByDate[date] = { date, count: 0 };
      }
      imagesByDate[date].count++;
    });

    const imagesByDateArray = Object.values(imagesByDate).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Data for daily analysis by prediction type
    const dailyAnalysisData: Record<string, DailyAnalysisItem> = {};

    filteredImages.forEach((img) => {
      const fullDate = timestampToDate(img.filename);
      const date = extractDatePart(fullDate);
      if (date === "") return;

      const prediction = img.metadata?.Prediction;
      if (!prediction) return;

      if (!dailyAnalysisData[date]) {
        dailyAnalysisData[date] = {
          date,
          "Asphalt bad": 0,
          "Paved bad": 0,
          "Unpaved bad": 0,
          Rain: 0,
        };
      }

      // Increment count for the specific prediction type
      if (dailyAnalysisData[date][prediction] !== undefined) {
        const currentValue = dailyAnalysisData[date][prediction];
        if (typeof currentValue === "number") {
          dailyAnalysisData[date][prediction] = currentValue + 1;
        }
      }
    });

    const dailyAnalysisArray = Object.values(dailyAnalysisData).sort(
      (a: DailyAnalysisItem, b: DailyAnalysisItem) =>
        a.date.localeCompare(b.date)
    );

    // Data for images by prediction chart
    const predictionData = [
      { name: "Asphalt", value: stats.asphaltbadCount },
      { name: "Paved", value: stats.pavedbadCount },
      { name: "Unpaved", value: stats.unpavedbadCount },
      { name: "Rain", value: stats.rainCount },
    ].filter((item) => item.value > 0);

    // Data for images by location availability
    const locationData = [
      { name: "Has GPS", value: stats.imagesWithLocation },
      { name: "No GPS", value: stats.imagesWithoutLocation },
    ];

    return {
      imagesByDate: imagesByDateArray,
      dailyAnalysis: dailyAnalysisArray,
      predictionData,
      locationData,
    };
  }, [filteredImages, stats]);

  // Get unique prediction values for filter dropdown
  const uniquePredictions = useMemo(() => {
    return Array.from(
      new Set(images.map((img) => img.metadata?.Prediction).filter(Boolean))
    );
  }, [images]);

  // Handle refresh data
  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Handle date range reset
  const handleResetFilters = () => {
    const dates = images
      .map((img) => {
        const fullDate = timestampToDate(img.filename);
        return extractDatePart(fullDate);
      })
      .filter((date) => date !== "");

    if (dates.length > 0) {
      dates.sort();
      setDateRange({
        start: dates[0],
        end: dates[dates.length - 1],
      });
    } else {
      setDateRange({ start: "", end: "" });
    }

    setFilterPrediction("");
  };

  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return "-";

    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  };

  // Generate CSV data for export
  const generateCsvData = () => {
    const headers = "Date,Filename,Prediction,Location\n";
    const rows = filteredImages
      .map((img) => {
        const fullDate = timestampToDate(img.filename);
        const date = extractDatePart(fullDate);
        const prediction = img.metadata?.Prediction || "No Prediction";
        const hasLocation = img.metadata?.Location;
        return `${date},"${img.filename}",${prediction},${hasLocation}`;
      })
      .join("\n");

    return `data:text/csv;charset=utf-8,${encodeURIComponent(headers + rows)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen ">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-green-600 border-gray-200 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Dashboard Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Analytics Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Road Condition Monitoring System
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <FaSyncAlt className="mr-2" />
              Refresh Data
            </button>

            <a
              href={generateCsvData()}
              download={`road-data-export-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FaDownload className="mr-2" />
              Export Data
            </a>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prediction
              </label>
              <select
                value={filterPrediction}
                onChange={(e) => setFilterPrediction(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Predictions</option>
                {uniquePredictions.map((prediction, index) => (
                  <option key={index} value={prediction}>
                    {prediction}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Total Images */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Images</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {stats.totalImages}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FaImage className="text-blue-500" size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {dateRange.start && dateRange.end && (
              <span>
                From {formatDateForDisplay(dateRange.start)} to{" "}
                {formatDateForDisplay(dateRange.end)}
              </span>
            )}
          </div>
        </div>

        {/* Images per Day */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Avg. Images/Day
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {stats.averageImagesPerDay}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <FaCalendarDay className="text-purple-500" size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <span>
              Most active: {formatDateForDisplay(stats.mostActiveDay.date)} (
              {stats.mostActiveDay.count} images)
            </span>
          </div>
        </div>

        {/* Location Available */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">With Location</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {stats.imagesWithLocation}
              </h3>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <FaMapMarkerAlt className="text-yellow-600" size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <span>
              {stats.totalImages > 0
                ? (
                    (stats.imagesWithLocation / stats.totalImages) *
                    100
                  ).toFixed(1)
                : 0}
              % have GPS data
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Images by Date */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FaCalendarAlt className="mr-2 text-gray-500" />
            Images by Date
          </h3>
          <div className="h-80">
            {chartData.imagesByDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData.imagesByDate}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#047857" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#047857"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                    tickFormatter={(value) => formatDateForDisplay(value)}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      `Date: ${formatDateForDisplay(value)}`
                    }
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    name="Images"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available for the selected date range
              </div>
            )}
          </div>
        </div>

        {/* Images by Prediction Status */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FaChartPie className="mr-2 text-gray-500" />
            Road Condition Analysis
          </h3>
          <div className="h-80">
            {stats.totalImages > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.predictionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                  >
                    {chartData.predictionData.map((entry, index) => {
                      const colorMap: Record<string, string> = {
                        Asphalt: "#EF4444",
                        Paved: "#F59E0B",
                        Unpaved: "#8B5CF6",
                        Rain: "#3B82F6",
                      };
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={colorMap[entry.name] || "#6B7280"} // fallback màu xám
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} images`, ""]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available for the selected filters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Data Availability */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FaMapMarkerAlt className="mr-2 text-gray-500" />
            Location Data Availability
          </h3>
          <div className="h-80">
            {stats.totalImages > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.locationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                  >
                    <Cell fill="#FBBF24" />
                    <Cell fill="#9CA3AF" />
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} images`, ""]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available for the selected filters
              </div>
            )}
          </div>
        </div>

        {/* Daily Analysis Results */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FaChartBar className="mr-2 text-gray-500" />
            Daily Analysis Results
          </h3>
          <div className="h-80">
            {chartData.dailyAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.dailyAnalysis}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="date"
                    scale="band"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                    tickFormatter={(value) => formatDateForDisplay(value)}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: "#E5E7EB" }}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      `Date: ${formatDateForDisplay(value)}`
                    }
                    formatter={(value: number, name: string) => [
                      `${value} images`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend />

                  {/* 4 loại hư hỏng */}
                  <Bar
                    dataKey="Asphalt bad"
                    fill={BAR_COLORS["Asphalt bad"]}
                    name="Asphalt bad"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="Paved bad"
                    fill={BAR_COLORS["Paved bad"]}
                    name="Paved bad"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="Unpaved bad"
                    fill={BAR_COLORS["Unpaved bad"]}
                    name="Unpaved bad"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="Rain"
                    fill={BAR_COLORS["Rain"]}
                    name="Rain"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available for the selected date range
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
