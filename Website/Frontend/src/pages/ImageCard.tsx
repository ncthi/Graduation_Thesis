import React from "react";

type Props = {
  imageUrl: string;
  fileName: string;
  uploadedAt: string;
  label: string;
};

const ImageCard: React.FC<Props> = ({ imageUrl, fileName, uploadedAt, label }) => {

  const labelColorClass =
    label === "Bad road" ? "text-red-700" : label === "Good road" ? "text-green-700" : "text-gray-700";

  return (
    <div className="bg-white shadow-md rounded-xl overflow-hidden w-full max-w-md mx-auto border border-gray-200">
      <img src={imageUrl} alt={fileName} className="w-full h-48 object-cover" />
      <div className="p-4 space-y-1 text-left">
        <h3 className="text-lg font-semibold text-gray-800">{fileName}</h3>
        <p className="text-sm text-gray-500">Uploaded at: {uploadedAt}</p>
        <p className="text-sm">
          <span className={`font-medium ${labelColorClass}`}>Label:</span> {label}
        </p>
      </div>
    </div>
  );
};

export default ImageCard;
