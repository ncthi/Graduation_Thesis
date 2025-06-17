import { useState, useEffect, useMemo } from "react";
import axiosRequest from "../config/axios.config";
import { timestampToDate } from "../config/timestamp.config";
import { XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,} from "recharts";
import { FaCalendarAlt, FaMapMarkerAlt, FaImage, FaCalendarDay, FaDownload, FaSyncAlt } from "react-icons/fa";
import { FaRoadCircleExclamation, FaRoadCircleCheck  } from "react-icons/fa6";
type ImageItem = {
  filename: string;
  metadata?: {
    Prediction?: string;
    Location?: string;
  };
};

type DashboardStats = {
  totalImages: number;
  damagedCount: number;
  undamagedCount: number;
  imagesWithLocation: number;
  imagesWithoutLocation: number;
  averageImagesPerDay: number;
  mostActiveDay: {
    date: string;
    count: number;
  };
};

// Helper function to extract date part (YYYY-MM-DD) from Vietnamese date format
const extractDatePart = (vietnameseDateString: string): string => {
  if (!vietnameseDateString || vietnameseDateString === "Unknown") return "";
  
  // Extract the date part from format "00:43:13 07/05/2025"
  const parts = vietnameseDateString.split(" ");
  if (parts.length < 2) return "";
  
  // Get the date part (e.g., "07/05/2025")
  const datePart = parts[1];
  
  // Convert from DD/MM/YYYY to YYYY-MM-DD for HTML date input
  const [day, month, year] = datePart.split("/");
  return `${year}-${month}-${day}`;
};

// Helper function to check if a date is within range
const isDateInRange = (dateStr: string, start: string, end: string): boolean => {
  if (!start || !end || !dateStr) return true;
  
  // Convert Vietnamese date format to YYYY-MM-DD for comparison
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
        setImages(res.data.images);
        
        // Set initial date range based on available data
        if (res.data.images.length > 0) {
          const dates = res.data.images.map((img: ImageItem) => {
            const fullDate = timestampToDate(img.filename);
            return extractDatePart(fullDate);
          }).filter((date: string) => date !== "");
          
          if (dates.length > 0) {
            dates.sort();
            setDateRange({
              start: dates[0],
              end: dates[dates.length - 1],
            });
          }
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
    return images.filter(img => {
      const fullDate = timestampToDate(img.filename);
      
      const inDateRange = isDateInRange(
        fullDate,
        dateRange.start,
        dateRange.end
      );
      
      const matchesPrediction = 
        !filterPrediction || 
        img.metadata?.Prediction?.toLowerCase() === filterPrediction.toLowerCase();
      
      return inDateRange && matchesPrediction;
    });
  }, [images, dateRange, filterPrediction]);

  // Calculate dashboard statistics
  const stats: DashboardStats = useMemo(() => {
    // Default stats
    const defaultStats: DashboardStats = {
      totalImages: 0,
      damagedCount: 0,
      undamagedCount: 0,
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
    filteredImages.forEach(img => {
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
      damagedCount: filteredImages.filter(img => 
        img.metadata?.Prediction === "Bad road"
      ).length,
      undamagedCount: filteredImages.filter(img => 
        img.metadata?.Prediction === "Good road"
      ).length,
      imagesWithLocation: filteredImages.filter(img => 
        !!img.metadata?.Location
      ).length,
      imagesWithoutLocation: filteredImages.filter(img => 
        !img.metadata?.Location
      ).length,
      averageImagesPerDay: uniqueDays ? +(filteredImages.length / uniqueDays).toFixed(1) : 0,
      mostActiveDay,
    };
  }, [filteredImages]);

  // Prepare data for charts
  const chartData = useMemo(() => {
    // Data for images by date chart
    const imagesByDate: Record<string, { date: string; count: number }> = {};
    
    filteredImages.forEach(img => {
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

    // Data for images by prediction chart
    const predictionData = [
      { name: "Damaged", value: stats.damagedCount },
      { name: "Undamaged", value: stats.undamagedCount },
      { name: "No Prediction", value: stats.totalImages - stats.damagedCount - stats.undamagedCount },
    ].filter(item => item.value > 0);

    // Data for images by location availability
    const locationData = [
      { name: "With Location", value: stats.imagesWithLocation },
      { name: "Without Location", value: stats.imagesWithoutLocation },
    ];

    return {
      imagesByDate: imagesByDateArray,
      predictionData,
      locationData,
    };
  }, [filteredImages, stats]);

  // Get unique prediction values for filter dropdown
  const uniquePredictions = useMemo(() => {
    return Array.from(
      new Set(images.map(img => img.metadata?.Prediction).filter(Boolean))
    );
  }, [images]);

  // Handle refresh data
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle date range reset
  const handleResetFilters = () => {
    const dates = images.map(img => {
      const fullDate = timestampToDate(img.filename);
      return extractDatePart(fullDate);
    }).filter(date => date !== "");
    
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

  // Format date for display
  const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return "-";
    
    // Convert YYYY-MM-DD to DD/MM/YYYY for display
    const [year, month, day] = isoDate.split("-");
    return `${day}/${month}/${year}`;
  };

  // Generate CSV data for export
  const generateCsvData = () => {
    const headers = "Date,Filename,Prediction,Location (Decimal)\n";
    const rows = filteredImages.map(img => {
      const fullDate = timestampToDate(img.filename);
      const date = extractDatePart(fullDate);
      const prediction = img.metadata?.Prediction || "No Prediction";
      const hasLocation = img.metadata?.Location;
      return `${date},"${img.filename}",${prediction},${hasLocation}`;
    }).join("\n");
    
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
    <div className="p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {/* Các component nội dung khác tại đây */}
    <div className="max-w-7xl mx-auto p-6">
      {/* Dashboard Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
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
              download={`road-data-export-${new Date().toISOString().slice(0, 10)}.csv`}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prediction</label>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        {/* Total Images */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Images</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalImages}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FaImage className="text-blue-500" size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {dateRange.start && dateRange.end && (
              <span>From {formatDateForDisplay(dateRange.start)} to {formatDateForDisplay(dateRange.end)}</span>
            )}
          </div>
        </div>
        
        {/* Images per Day */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Avg. Images/Day</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.averageImagesPerDay}</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <FaCalendarDay className="text-purple-500" size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <span>Most active: {formatDateForDisplay(stats.mostActiveDay.date)} ({stats.mostActiveDay.count} images)</span>
          </div>
        </div>
        
        {/* Damaged Roads */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Damaged Roads</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.damagedCount}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <FaRoadCircleCheck  className="text-green-500" size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <span>{stats.totalImages > 0 ? ((stats.damagedCount / stats.totalImages) * 100).toFixed(1) : 0}% of total images</span>
          </div>
        </div>

        {/* UnDamaged Roads */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Undamaged Roads</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.undamagedCount}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <FaRoadCircleExclamation  className="text-red-500" size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <span>{stats.totalImages > 0 ? ((stats.undamagedCount / stats.totalImages) * 100).toFixed(1) : 0}% of total images</span>
          </div>
        </div>
        
        {/* Location Available */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">With Location</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.imagesWithLocation}</h3>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <FaMapMarkerAlt className="text-yellow-600" size={20} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            <span>{stats.totalImages > 0 ? ((stats.imagesWithLocation / stats.totalImages) * 100).toFixed(1) : 0}% have GPS data</span>
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
                      <stop offset="95%" stopColor="#047857" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                    tickFormatter={(value) => formatDateForDisplay(value)}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <Tooltip
                    labelFormatter={(value) => `Date: ${formatDateForDisplay(value)}`}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#059669"
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    strokeWidth={2}
                    dot={{ stroke: '#059669', strokeWidth: 2, r: 4, fill: '#fff' }}
                    activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available for the selected period.
              </div>
            )}
          </div>
        </div>

        {/* Prediction Distribution (Placeholder) */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            {/* <FaChartPie className="mr-2 text-gray-500" /> */}
            Prediction Distribution
          </h3>
          <div className="h-80">
            {/* Placeholder for Pie Chart */}
            <div className="flex items-center justify-center h-full text-gray-400">
              Chart coming soon...
            </div>
          </div>
        </div>
      </div>

      {/* Location Data (Placeholder) */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          {/* <FaMapMarkerAlt className="mr-2 text-gray-500" /> */}
          Location Data Overview
        </h3>
        <div className="h-60">
          {/* Placeholder for Map or Location-based chart */}
          <div className="flex items-center justify-center h-full text-gray-400">
            Map or location chart coming soon...
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
