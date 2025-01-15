// src/app/[presentationId]/page.js
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Thermometer, Droplets, Wind } from "lucide-react";

const getAssetsFromDB = async (presentationId) => {
  const request = indexedDB.open("presentationsDB", 1);

  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("assets", "readonly");
      const store = transaction.objectStore("assets");
      const getRequest = store.get(presentationId);

      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
};

export default function PresentationView({ params }) {
  const [presentation, setPresentation] = useState(null);
  const [assets, setAssets] = useState(null);
  const [sensorData, setSensorData] = useState({
    temperature: 23.5,
    humidity: 45,
    pressure: 1013,
  });

  useEffect(() => {
    const loadPresentation = async () => {
      try {
        const request = indexedDB.open("presentationsDB", 1);
        request.onsuccess = async () => {
          const db = request.result;
          const transaction = db.transaction("presentations", "readonly");
          const store = transaction.objectStore("presentations");
          const getRequest = store.get(params.presentationId);

          getRequest.onsuccess = async () => {
            const presentationData = getRequest.result;
            if (presentationData) {
              setPresentation(presentationData);
              const assets = await getAssetsFromDB(params.presentationId);
              setAssets(assets);
            }
          };
        };
      } catch (error) {
        console.error("Error loading presentation:", error);
      }
    };

    loadPresentation();

    // Simulate sensor data updates
    const interval = setInterval(() => {
      setSensorData({
        temperature: (20 + Math.random() * 10).toFixed(1),
        humidity: Math.floor(40 + Math.random() * 20),
        pressure: Math.floor(1000 + Math.random() * 30),
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [params.presentationId]);

  if (!presentation || !assets) return null;

  // Rest of your component remains the same, just use assets instead of presentation.assets
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with two logos */}
      <header className="w-full h-24 p-2 flex justify-between items-center border-b-2 shadow-lg">
        <img
          src={assets.logos[0]}
          alt="Logo 1"
          className="w-auto h-16 object-contain"
        />
        <img
          src={assets.logos[1]}
          alt="Logo 2"
          className="w-auto h-16 object-contain"
        />
      </header>

      {/* Main content with video */}
      <main className="flex-1 flex items-center p-2 justify-center">
        <div className="relative w-full h-[72vh] aspect-video rounded-2xl overflow-hidden shadow-inner border-2">
          <video
            src={assets.video}
            autoPlay
            loop
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </main>

      {/* Footer with stats and logo */}
      <footer className="w-full border-t-2 shadow-lg">
        <div className="mx-auto p-2 flex justify-between items-center">
          <div className="flex gap-4">
            <Card className="w-48 bg-gradient-to-b from-white to-gray-50 rounded-xl border-0">
              <CardContent className="flex items-center p-4 bg-white/40 backdrop-blur-sm rounded-xl shadow-lg">
                <div className="h-8 w-8 bg-blue-500/10 rounded-full flex items-center justify-center mr-3">
                  <Thermometer className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Temperature
                  </p>
                  <p className="text-2xl font-medium text-gray-900">
                    {sensorData.temperature}°C
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="w-48 bg-gradient-to-b from-white to-gray-50 rounded-xl border-0">
              <CardContent className="flex items-center p-4 bg-white/40 backdrop-blur-sm rounded-xl shadow-lg">
                <div className="h-8 w-8 bg-blue-500/10 rounded-full flex items-center justify-center mr-3">
                  <Droplets className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Humidity</p>
                  <p className="text-2xl font-medium text-gray-900">
                    {sensorData.humidity}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="w-48 bg-gradient-to-b from-white to-gray-50 rounded-xl border-0">
              <CardContent className="flex items-center p-4 bg-white/40 backdrop-blur-sm rounded-xl shadow-lg">
                <div className="h-8 w-8 bg-blue-500/10 rounded-full flex items-center justify-center mr-3">
                  <Wind className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Pressure</p>
                  <p className="text-2xl font-medium text-gray-900">
                    {sensorData.pressure} hPa
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center">
            <img
              src={assets.logos[2]}
              alt="Logo 3"
              className="w-auto h-16 object-contain"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
