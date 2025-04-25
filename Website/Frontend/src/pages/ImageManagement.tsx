import image from "../assets/road.png";
import { useState } from "react";
const images = [
  {
    src: image,
    name: "Image 1",
    createdAt: "2025-04-10 14:00",
    category: "Road Sign",
  },
  {
    src: image,
    name: "Image 2",
    createdAt: "2025-04-10 14:30",
    category: "Traffic Light",
  },
  {
    src: image,
    name: "Image 3",
    createdAt: "2025-04-10 15:00",
    category: "Pedestrian",
  },
  {
    src: image,
    name: "Image 4",
    createdAt: "2025-04-10 15:30",
    category: "Speed Limit",
  },
  {
    src: image,
    name: "Image 1",
    createdAt: "2025-04-10 14:00",
    category: "Road Sign",
  },
  {
    src: image,
    name: "Image 2",
    createdAt: "2025-04-10 14:30",
    category: "Traffic Light",
  },
  {
    src: image,
    name: "Image 3",
    createdAt: "2025-04-10 15:00",
    category: "Pedestrian",
  },
  {
    src: image,
    name: "Image 4",
    createdAt: "2025-04-10 15:30",
    category: "Speed Limit",
  },
  {
    src: image,
    name: "Image 1",
    createdAt: "2025-04-10 14:00",
    category: "Road Sign",
  },
  {
    src: image,
    name: "Image 2",
    createdAt: "2025-04-10 14:30",
    category: "Traffic Light",
  },
  {
    src: image,
    name: "Image 3",
    createdAt: "2025-04-10 15:00",
    category: "Pedestrian",
  },
  {
    src: image,
    name: "Image 4",
    createdAt: "2025-04-10 15:30",
    category: "Speed Limit",
  },
];
export default function ImageManagement() {
  const [selectedImage, setSelectedImage] = useState<null | (typeof images)[0]>(
    null
  );
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6 text-green-800">All Images</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((img, index) => (
          <div
            key={index}
            onClick={() => setSelectedImage(img)}
            className="cursor-pointer bg-white shadow-lg rounded-xl overflow-hidden transition-transform hover:scale-105"
          >
            <img
              src={img.src}
              alt={img.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {img.name}
              </h2>
              <p className="text-sm text-gray-500">{img.createdAt}</p>
              <span className="text-sm inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                {img.category}
              </span>
            </div>
          </div>
        ))}
      </div>
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-xl overflow-hidden max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl font-bold"
            >
              &times;
            </button>
            <img
              src={selectedImage.src}
              alt={selectedImage.name}
              className="w-full object-cover max-h-96"
            />
            <div className="p-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedImage.name}
              </h2>
              <p className="text-sm text-gray-500">{selectedImage.createdAt}</p>
              <span className="text-sm inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                {selectedImage.category}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
