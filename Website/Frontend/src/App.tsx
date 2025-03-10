import { useState, useEffect } from 'react'
import './App.css'

interface Image {
  timestamp: string;
  filename: string;
  result: {
    damage_type: string;
    confidence: number;
  };
}
function App() {
  const [, setImages] = useState<Image[]>([]);

  useEffect(() => {
      fetch("/api/v1/images")
          .then(res => res.json())
          .then(setImages);
  }, []);

  return (
      <div>
          <h1>Road Quality Monitoring</h1>
          {/* <video src="" controls autoPlay />
          <ul>
              {images.map(img => (
                  <li key={img.timestamp}>
                      <img src={`/uploads/${img.filename}`} width="200" />
                      <p>{img.result.damage_type} - {img.result.confidence}</p>
                  </li>
              ))}
          </ul> */}
      </div>
  );
}


export default App
