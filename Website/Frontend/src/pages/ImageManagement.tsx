import { useState, useEffect } from "react";
import axiosRequest from "../config/axios.config";
import { parseLocation } from "../config/location.config";
import { timestampToDate } from "../config/timestamp.config";
import {
  FaClock,
  FaMapMarkerAlt,
  FaBrain,
  FaFileImage,
  FaSearch,
  FaFilter,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaSyncAlt,
  FaCalendarAlt,
} from "react-icons/fa";

type ImageItem = {
  filename: string;
  metadata?: {
    Prediction?: string;
    Location?: string;
  };
};

export default function ImageManagement() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const imagesPerPage = 8;

  // Fetch images on component mount
  useEffect(() => {
    async function fetchImages() {
      setLoading(true);
      try {
        const res = await axiosRequest.get("list-images/");
        const imageList = Array.isArray(res.data.images) ? res.data.images : [];
        setImages(imageList);
        setFilteredImages(imageList);
      } catch (error) {
        console.error("Error loading image list:", error);
        setError("Failed to load images. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchImages();
  }, [refreshTrigger]);

  // Handle refresh data
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Parse timestamp from filename format "00:42:45 07/05/2025"
  const parseTimestamp = (filename: string): Date | null => {
    try {
      // Extract the timestamp part from the filename
      const timestampStr = timestampToDate(filename);
      if (!timestampStr) return null;
      
      // Parse the date string format "00:42:45 07/05/2025"
      const [timePart, datePart] = timestampStr.split(' ');
      if (!datePart) return null;
      
      // Parse date in format DD/MM/YYYY
      const [day, month, year] = datePart.split('/').map(num => parseInt(num, 10));
      
      // Parse time in format HH:MM:SS
      const [hours, minutes, seconds] = timePart.split(':').map(num => parseInt(num, 10));
      
      // Create and return a date object
      // Note: JavaScript months are 0-indexed (0 = January, 11 = December)
      return new Date(year, month - 1, day, hours, minutes, seconds);
    } catch (error) {
      console.error("Error parsing timestamp:", error);
      return null;
    }
  };

  // Helper function to check if date is within range
  const isDateInRange = (filename: string): boolean => {
    if (!startDate && !endDate) return true;
    
    // Parse the timestamp from the filename
    const date = parseTimestamp(filename);
    if (!date) return true; // If parsing fails, don't filter it out
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start) {
      // Set start date to beginning of the day for inclusive filtering
      const startOfDay = new Date(start);
      startOfDay.setHours(0, 0, 0, 0);
      if (date < startOfDay) return false;
    }
    
    if (end) {
      // Set end date to end of the day for inclusive filtering
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (date > endOfDay) return false;
    }
    
    return true;
  };

  // Filter images based on search term and date range
  useEffect(() => {
    let results = [...images];

    if (searchTerm) {
      results = results.filter((img) =>
        img.filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (startDate || endDate) {
      results = results.filter((img) => isDateInRange(img.filename));
    }

    setFilteredImages(results);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, startDate, endDate, images]);

  // Check if any date filters are active
  const isDateFilterActive = startDate || endDate;

  // Calculate pagination
  const indexOfLastImage = currentPage * imagesPerPage;
  const indexOfFirstImage = indexOfLastImage - imagesPerPage;
  const currentImages = filteredImages.slice(
    indexOfFirstImage,
    indexOfLastImage
  );
  const totalPages = Math.ceil(filteredImages.length / imagesPerPage);

  const getImageUrl = (filename: string) => {
    return `${axiosRequest.defaults.baseURL}get-image/${filename}`;
  };

  // Handle pagination navigation
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Handle image navigation in modal
  const navigateImages = (direction: "prev" | "next") => {
    if (!selectedImage) return;

    const currentIndex = filteredImages.findIndex(
      (img) => img.filename === selectedImage.filename
    );
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === "prev") {
      newIndex =
        currentIndex > 0 ? currentIndex - 1 : filteredImages.length - 1;
    } else {
      newIndex =
        currentIndex < filteredImages.length - 1 ? currentIndex + 1 : 0;
    }

    setSelectedImage(filteredImages[newIndex]);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setShowFilters(false);
  };

  // Format date for display
  const formatDateLabel = () => {
    if (startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    } else if (startDate) {
      return `From ${new Date(startDate).toLocaleDateString()}`;
    } else if (endDate) {
      return `Until ${new Date(endDate).toLocaleDateString()}`;
    }
    return "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen ">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-green-600 border-gray-200 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading image data...</p>
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
      {/* Header with stats and controls */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Image Analysis Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              {filteredImages.length} image
              {filteredImages.length !== 1 ? "s" : ""} available for analysis
            </p>
          </div>

          {/* Search and Filter Controls */}
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search filenames..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center px-4 py-2 rounded-lg border ${
                showFilters || isDateFilterActive
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              <FaFilter className="mr-2" />
              Filters {isDateFilterActive && "(1)"}
              {isDateFilterActive && (
                <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                  {formatDateLabel()}
                </span>
              )}
            </button>

            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <FaSyncAlt className="mr-2" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-fadeIn">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaCalendarAlt className="inline mr-1" /> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaCalendarAlt className="inline mr-1" /> End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentImages.map((img, index) => (
            <div
              key={index}
              onClick={() => setSelectedImage(img)}
              className="cursor-pointer bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:shadow-lg hover:translate-y-[-4px]"
            >
              <div className="h-48 relative overflow-hidden">
                <img
                  src={getImageUrl(img.filename)}
                  alt={img.filename}
                  className="w-full h-full object-cover"
                />
                {img.metadata?.Prediction && (
                  <div className="absolute top-3 right-3">
                    <span
                      className={`
                      px-2 py-1 text-xs font-bold uppercase rounded-full
                      ${
                        img.metadata.Prediction.toLowerCase() === "bad road"
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }
                    `}
                    >
                      {img.metadata.Prediction}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100">
                {/* Filename */}
                <div className="mb-3 pb-2 border-b border-gray-100">
                  <div className="flex items-center text-xs text-gray-500 truncate">
                    <FaFileImage className="mr-1 flex-shrink-0" />
                    <span className="truncate" title={img.filename}>
                      {img.filename}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {/* Capture time */}
                  <div className="flex items-start">
                    <FaClock className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">
                        Capture Time:
                      </span>
                      <div className="text-gray-800">
                        {timestampToDate(img.filename)}
                      </div>
                    </div>
                  </div>

                  {/* Prediction */}
                  {img.metadata?.Prediction && (
                    <div className="flex items-start">
                      <FaBrain className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-700">
                          Analysis Result:
                        </span>
                        <div
                          className={`font-semibold ${
                            img.metadata.Prediction.toLowerCase() === "bad road"
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {img.metadata.Prediction}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {img.metadata?.Location &&
                    (() => {
                      const location = parseLocation(img.metadata?.Location);
                      return location ? (
                        <div className="flex items-start">
                          <FaMapMarkerAlt className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-gray-700">
                              Location:
                            </span>
                            <div className="text-gray-800 space-y-1">
                              <div>Lat: {location.latDMS}</div>
                              <div>Lng: {location.lngDMS}</div>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center shadow-md">
          <div className="text-gray-400 mb-4">
            <FaSearch size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-medium text-gray-800">
              No images found
            </h3>
            <p className="text-gray-500 mt-2">
              No images match your current search criteria.
            </p>
          </div>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {filteredImages.length > 0 && (
        <div className="mt-8 flex justify-center">
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-md ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FaChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (num) =>
                  num === 1 ||
                  num === totalPages ||
                  (num >= currentPage - 1 && num <= currentPage + 1)
              )
              .map((number, i, arr) => {
                // Add ellipsis where needed
                if (i > 0 && number - arr[i - 1] > 1) {
                  return [
                    <span
                      key={`ellipsis-${i}`}
                      className="px-3 py-1 text-gray-500"
                    >
                      ...
                    </span>,
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md ${
                        currentPage === number
                          ? "bg-green-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {number}
                    </button>,
                  ];
                }
                return (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md ${
                      currentPage === number
                        ? "bg-green-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {number}
                  </button>
                );
              })
              .flat()}

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-md ${
                currentPage === totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FaChevronRight size={14} />
            </button>
          </nav>
        </div>
      )}

      {/* Image Detail Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-white rounded-xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 truncate">
                Image Details
              </h2>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Modal content */}
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              {/* Image container */}
              <div className="relative flex-1 bg-gray-900 flex items-center justify-center min-h-[300px]">
                <img
                  src={getImageUrl(selectedImage.filename)}
                  alt={selectedImage.filename}
                  className="max-w-full max-h-[70vh] object-contain"
                />

                {/* Navigation buttons */}
                <button
                  onClick={() => navigateImages("prev")}
                  className="absolute left-4 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 focus:outline-none"
                >
                  <FaChevronLeft size={16} />
                </button>
                <button
                  onClick={() => navigateImages("next")}
                  className="absolute right-4 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 focus:outline-none"
                >
                  <FaChevronRight size={16} />
                </button>
              </div>

              {/* Details sidebar */}
              <div className="w-full md:w-80 p-6 bg-gray-50 overflow-y-auto">
                <div className="space-y-4">
                  {/* Filename */}
                  <div>
                    <h3 className="text-sm text-gray-500">Filename</h3>
                    <p className="text-gray-800 font-mono text-sm break-all">
                      {selectedImage.filename}
                    </p>
                  </div>

                  {/* Prediction */}
                  {selectedImage.metadata?.Prediction && (
                    <div>
                      <h3 className="text-sm text-gray-500">Analysis Result</h3>
                      <div
                        className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                          selectedImage.metadata.Prediction.toLowerCase() ===
                          "bad road"
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {selectedImage.metadata.Prediction}
                      </div>
                    </div>
                  )}

                  {/* Capture Time */}
                  <div>
                    <h3 className="text-sm text-gray-500">Capture Time</h3>
                    <p className="text-gray-800">
                      {timestampToDate(selectedImage.filename)}
                    </p>
                  </div>

                  {/* Location */}
                  {selectedImage.metadata?.Location &&
                    (() => {
                      const location = parseLocation(
                        selectedImage.metadata?.Location
                      );
                      return location ? (
                        <div>
                          <h3 className="text-sm text-gray-500">
                            GPS Coordinates
                          </h3>
                          <div className="mt-1 p-3 bg-white rounded-lg border border-gray-200">
                            <div className="grid grid-cols-[80px_1fr] gap-1">
                              <span className="text-gray-500">Latitude:</span>
                              <span className="text-gray-800 font-medium">
                                {location.latDMS}
                              </span>
                              <span className="text-gray-500">Longitude:</span>
                              <span className="text-gray-800 font-medium">
                                {location.lngDMS}
                              </span>
                              <span className="text-gray-500">Decimal:</span>
                              <span className="text-gray-800 font-mono text-sm">
                                {location.lat}, {location.lng}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}