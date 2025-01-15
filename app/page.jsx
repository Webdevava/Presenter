// src/app/page.jsx
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  X,
  Upload,
  Play,
  Image as ImageIcon,
  Menu,
  Home,
  Presentation,
  Settings,
  Users,
  Bell,
  HelpCircle,
  LogOut,
  ChevronDown,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("presentationsDB", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("presentations")) {
        db.createObjectStore("presentations", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("assets")) {
        db.createObjectStore("assets", { keyPath: "id" });
      }
    };
  });
};

// DB operations
const dbOperations = {
  async getAllPresentations() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("presentations", "readonly");
      const store = transaction.objectStore("presentations");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

async savePresentationAssets(presentationId, assets) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["presentations", "assets"], "readwrite");
    
    // Save assets
    const assetsStore = transaction.objectStore("assets");
    assetsStore.put({
      id: presentationId,
      ...assets
    });

    // Update presentation reference
    const presentationsStore = transaction.objectStore("presentations");
    const getRequest = presentationsStore.get(presentationId);
    
    getRequest.onsuccess = () => {
      let presentation = getRequest.result;
      if (!presentation) {
        // If presentation doesn't exist, create it
        presentation = {
          id: presentationId,
          title: "Presentation " + presentationId,
          description: "Description",
          hasAssets: true
        };
      } else {
        presentation.hasAssets = true;
      }
      presentationsStore.put(presentation);
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
},

  async getAssets(presentationId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("assets", "readonly");
      const store = transaction.objectStore("assets");
      const request = store.get(presentationId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async clearAssets(presentationId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        ["presentations", "assets"],
        "readwrite"
      );

      // Remove assets
      const assetsStore = transaction.objectStore("assets");
      assetsStore.delete(presentationId);

      // Update presentation reference
      const presentationsStore = transaction.objectStore("presentations");
      const getRequest = presentationsStore.get(presentationId);

      getRequest.onsuccess = () => {
        const presentation = getRequest.result;
        presentation.hasAssets = false;
        presentationsStore.put(presentation);
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },
};


const Sidebar = ({ isMobile = false }) => {
  const sidebarContent = (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4">
        <h2 className="text-xl font-semibold text-white mb-6">Presenter</h2>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {[
          { icon: Home, label: "Dashboard", active: true },
          { icon: Presentation, label: "Presentations" },
          { icon: Users, label: "Team" },
          { icon: Bell, label: "Notifications" },
          { icon: Settings, label: "Settings" },
          { icon: HelpCircle, label: "Help & Support" },
        ].map(({ icon: Icon, label, active }) => (
          <Button
            key={label}
            variant="ghost"
            className={`w-full justify-start gap-4 ${
              active
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Button>
        ))}
      </nav>
      <div className="p-6 border-t border-gray-800">
        <Button
          variant="ghost"
          className="w-full justify-start gap-4 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <SheetContent side="left" className="p-0 w-72">
        {sidebarContent}
      </SheetContent>
    );
  }

  return <div className="hidden lg:block w-72">{sidebarContent}</div>;
};

export default function Dashboard() {
  const router = useRouter();
  const [presentations, setPresentations] = useState([]);
  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [assets, setAssets] = useState({
    logos: [null, null, null],
    video: null,
  });

  useEffect(() => {
    const initializePresentations = async () => {
      try {
        const db = await initDB();
        let stored = await dbOperations.getAllPresentations();

        if (!stored || stored.length === 0) {
          const defaultPresentations = [
            {
              id: "1",
              title: "Presentation 001",
              description: "Primary presentation",
              hasAssets: false,
            },
            {
              id: "2",
              title: "Presentation 002",
              description: "Secondary presentation",
              hasAssets: false,
            },
          ];

          const transaction = db.transaction("presentations", "readwrite");
          const store = transaction.objectStore("presentations");

          // Use Promise.all to wait for all additions to complete
          await Promise.all(
            defaultPresentations.map(
              (pres) =>
                new Promise((resolve, reject) => {
                  const request = store.add(pres);
                  request.onsuccess = () => resolve();
                  request.onerror = () => reject(request.error);
                })
            )
          );

          stored = defaultPresentations;
        }
        setPresentations(stored);
      } catch (error) {
        console.error("Error initializing presentations:", error);
      }
    };

    initializePresentations();
  }, []);

  const handleFileChange =
    (type, index = null) =>
    async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (type === "logo") {
            const newLogos = [...assets.logos];
            newLogos[index] = reader.result;
            setAssets({ ...assets, logos: newLogos });
          } else {
            setAssets({ ...assets, video: reader.result });
          }
        };
        reader.readAsDataURL(file);
      }
    };

  const handleSaveAssets = async () => {
    try {
      await dbOperations.savePresentationAssets(
        selectedPresentation.id,
        assets
      );
      const updatedPresentations = presentations.map((pres) =>
        pres.id === selectedPresentation.id
          ? { ...pres, hasAssets: true }
          : pres
      );
      setPresentations(updatedPresentations);
      setIsOpen(false);
      setAssets({ logos: [null, null, null], video: null });
    } catch (error) {
      console.error("Error saving assets:", error);
    }
  };

  const handleClearAssets = async (presentationId) => {
    try {
      await dbOperations.clearAssets(presentationId);
      const updatedPresentations = presentations.map((pres) =>
        pres.id === presentationId ? { ...pres, hasAssets: false } : pres
      );
      setPresentations(updatedPresentations);
    } catch (error) {
      console.error("Error clearing assets:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navigation */}
          <header className="h-16 border-b bg-white flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <Sidebar isMobile />
              </Sheet>

              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search presentations..."
                  className="pl-10 bg-gray-50 border-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="/placeholder.jpg" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <span>John Doe</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Help</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-4xl font-semibold mb-2 text-gray-900">
                    Presentations
                  </h1>
                  <p className="text-lg text-gray-500">
                    Create and manage your dynamic presentations
                  </p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="w-4 h-4 mr-2" />
                  New Presentation
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {presentations.map((presentation) => (
                  <Card
                    key={presentation.id}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300"
                  >
                    {/* Keep existing card content... */}
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">
                        {presentation.title}
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        {presentation.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {presentation.hasAssets ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-green-600">
                              Assets Added
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleClearAssets(presentation.id)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Clear Assets
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No assets added yet
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                            onClick={() => {
                              setSelectedPresentation(presentation);
                              setAssets({
                                logos: [null, null, null],
                                video: null,
                              });
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Add Assets
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-semibold mb-4">
                              Add Presentation Assets
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6 py-4">
                            <div className="space-y-4">
                              <h4 className="font-medium text-lg">Logos</h4>
                              <div className="grid grid-cols-3 gap-4">
                                {[0, 1, 2].map((index) => (
                                  <div key={index} className="space-y-2">
                                    <div className="relative">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange(
                                          "logo",
                                          index
                                        )}
                                        className="hidden"
                                        id={`logo-${index}`}
                                      />
                                      <label
                                        htmlFor={`logo-${index}`}
                                        className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                                      >
                                        {assets.logos[index] ? (
                                          <img
                                            src={assets.logos[index]}
                                            alt={`Logo ${index + 1}`}
                                            className="w-20 h-20 object-contain"
                                          />
                                        ) : (
                                          <>
                                            <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-500">
                                              Logo {index + 1}
                                            </span>
                                          </>
                                        )}
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="font-medium text-lg">Video</h4>
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="video/*"
                                  onChange={handleFileChange("video")}
                                  className="hidden"
                                  id="video-upload"
                                />
                                <label
                                  htmlFor="video-upload"
                                  className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                  {assets.video ? (
                                    <video
                                      className="w-full h-full object-contain"
                                      controls
                                    >
                                      <source
                                        src={assets.video}
                                        type="video/mp4"
                                      />
                                    </video>
                                  ) : (
                                    <>
                                      <Play className="w-8 h-8 text-gray-400 mb-2" />
                                      <span className="text-sm text-gray-500">
                                        Upload Video
                                      </span>
                                    </>
                                  )}
                                </label>
                              </div>
                            </div>
                            <Button
                              onClick={handleSaveAssets}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              disabled={
                                !assets.video ||
                                assets.logos.some((logo) => !logo)
                              }
                            >
                              Save Assets
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="default"
                        onClick={() => router.push(`/${presentation.id}`)}
                        disabled={!presentation.hasAssets}
                        className="bg-gray-900 text-white hover:bg-gray-800"
                      >
                        View Presentation
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}