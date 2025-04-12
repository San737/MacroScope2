import { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/library";
import {
  CameraIcon,
  XMarkIcon,
  ArrowPathIcon,
  QrCodeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export default function AddMeal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [scanMode, setScanMode] = useState("photo"); // "photo", "barcode", or "recognition"
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [formData, setFormData] = useState({
    mealType: "breakfast",
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    notes: "",
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (!showCamera) return;

    let stream = null;
    async function enableStream() {
      try {
        console.log("Requesting camera access...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        console.log("Camera access granted, setting up video stream...");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          console.log("Video stream attached to video element");
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Could not access camera. Please check permissions.");
        setShowCamera(false);
      } finally {
        setIsProcessing(false);
      }
    }

    enableStream();

    return () => {
      if (stream) {
        console.log("Cleaning up camera stream...");
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log("Track stopped:", track.label);
        });
      }
    };
  }, [showCamera, facingMode]);

  const processImage = async (imageFile, mode) => {
    setIsProcessing(true);
    setScanResult(null);
    setError(null);

    try {
      if (mode === "barcode") {
        // Create an image element for barcode scanning
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // Initialize barcode reader
        const codeReader = new BrowserMultiFormatReader();
        try {
          // Create a canvas and draw the image
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          // Scan for barcode
          const result = await codeReader.decodeFromImage(img);

          if (!result) {
            throw new Error("No barcode found in image");
          }

          // Get product information from Open Food Facts API
          const response = await fetch(
            `https://world.openfoodfacts.org/api/v3/product/${result.text}.json`
          );
          const data = await response.json();

          if (data.status === "success" && data.product) {
            const product = data.product;
            const nutriments = product.nutriments || {};

            const nutritionInfo = {
              product_name: product.product_name || "Unknown Product",
              nutrients: {
                calories: Math.round(nutriments["energy-kcal_100g"]) || 0,
                protein: Math.round(nutriments.proteins_100g) || 0,
                carbs: Math.round(nutriments.carbohydrates_100g) || 0,
                fats: Math.round(nutriments.fat_100g) || 0,
              },
            };

            setScanResult({
              type: "barcode",
              name: nutritionInfo.product_name,
              nutrients: nutritionInfo.nutrients,
            });

            // Auto-fill the form with nutritional data
            setFormData((prev) => ({
              ...prev,
              calories: nutritionInfo.nutrients.calories || "",
              protein: nutritionInfo.nutrients.protein || "",
              carbs: nutritionInfo.nutrients.carbs || "",
              fats: nutritionInfo.nutrients.fats || "",
              notes: `Product: ${nutritionInfo.product_name}`,
            }));
          } else {
            throw new Error("Product not found in database");
          }
        } finally {
          codeReader.reset();
        }
      } else {
        // Handle other modes (photo, recognition) as before
        const compressedImage = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, width, height);

              resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(imageFile);
        });

        // Process other modes using Supabase function
        const imageData = compressedImage.split(",")[1];
        const { data, error } = await supabase.functions.invoke(
          "food-recognition",
          {
            body: { image: imageData },
          }
        );

        if (error) throw error;

        if (data?.predictions) {
          setScanResult({
            type: "recognition",
            predictions: data.predictions,
          });
        }
      }
    } catch (err) {
      console.error("Processing error:", err);
      setError(err.message || "Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const switchCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsProcessing(true);
    setFacingMode((current) =>
      current === "environment" ? "user" : "environment"
    );
  };

  const startCamera = async () => {
    try {
      setError(null);
      console.log("Starting camera...");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser");
      }

      setShowCamera(true);
      setIsProcessing(true);
    } catch (err) {
      console.error("Camera start error:", err);
      setError(err.message);
    }
  };

  const stopCamera = () => {
    console.log("Stopping camera...");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setError(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], "meal-photo.jpg", { type: "image/jpeg" });
      setImage(file);
      setImagePreview(URL.createObjectURL(file));

      // Process the image if in scan mode
      if (scanMode !== "photo") {
        processImage(file, scanMode);
      }

      stopCamera();
    }, "image/jpeg");
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));

      // Process the image if in scan mode
      if (scanMode !== "photo") {
        processImage(file, scanMode);
      }
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      let imageUrl = null;

      if (image) {
        const fileExt = image.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("meal-images")
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("meal-images").getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error: insertError } = await supabase.from("meals").insert([
        {
          user_id: user.id,
          meal_type: formData.mealType,
          calories: Math.round(Number(formData.calories)),
          protein: Math.round(Number(formData.protein)),
          carbs: Math.round(Number(formData.carbs)),
          fats: Math.round(Number(formData.fats)),
          notes: formData.notes,
          image_url: imageUrl,
        },
      ]);

      if (insertError) throw insertError;

      navigate("/food-log");
    } catch (error) {
      console.error("Error saving meal:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Meal</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Meal Type
            </label>
            <select
              name="mealType"
              value={formData.mealType}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          {showCamera ? (
            <div className="relative bg-black rounded-lg overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover rounded-lg"
                style={{
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
              />
              <div className="absolute top-4 left-4 z-20 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setScanMode("photo")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    scanMode === "photo"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 bg-opacity-50 text-white"
                  }`}
                >
                  Photo
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode("barcode")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    scanMode === "barcode"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 bg-opacity-50 text-white"
                  }`}
                >
                  Barcode
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode("recognition")}
                  className={`px-3 py-1 rounded-full text-sm ${
                    scanMode === "recognition"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 bg-opacity-50 text-white"
                  }`}
                >
                  Recognize
                </button>
              </div>
              <div className="absolute top-4 right-4 z-20">
                <button
                  type="button"
                  onClick={switchCamera}
                  className="bg-gray-800 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                  disabled={isProcessing}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4 z-20">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow hover:bg-indigo-700 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  {scanMode === "photo"
                    ? "Take Photo"
                    : scanMode === "barcode"
                    ? "Scan Barcode"
                    : "Recognize Food"}
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-gray-600 text-white px-4 py-2 rounded-full shadow hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 relative"
              >
                <input {...getInputProps()} />
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 mx-auto mb-4"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage(null);
                        setImagePreview(null);
                        setScanResult(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    Drag & drop a meal image here, or click to select
                  </p>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}
              </div>

              {scanResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    {scanResult.type === "barcode"
                      ? "Product Information"
                      : "Recognition Results"}
                  </h3>
                  {scanResult.type === "barcode" ? (
                    <div>
                      <p className="text-sm text-gray-600">
                        Product: {scanResult.name}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <p>Calories: {scanResult.nutrients.calories}kcal</p>
                        <p>Protein: {scanResult.nutrients.protein}g</p>
                        <p>Carbs: {scanResult.nutrients.carbs}g</p>
                        <p>Fats: {scanResult.nutrients.fats}g</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {scanResult.predictions.map((pred, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {pred.class}
                          </span>
                          <span className="text-sm text-gray-900">
                            {(pred.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setScanMode("photo");
                    startCamera();
                  }}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <CameraIcon className="h-5 w-5 mr-2" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanMode("barcode");
                    startCamera();
                  }}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <QrCodeIcon className="h-5 w-5 mr-2" />
                  Scan Barcode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanMode("recognition");
                    startCamera();
                  }}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Recognize
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Calories
              </label>
              <input
                type="number"
                name="calories"
                value={formData.calories}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Protein (g)
              </label>
              <input
                type="number"
                name="protein"
                value={formData.protein}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Carbs (g)
              </label>
              <input
                type="number"
                name="carbs"
                value={formData.carbs}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fats (g)
              </label>
              <input
                type="number"
                name="fats"
                value={formData.fats}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XMarkIcon
                    className="h-5 w-5 text-red-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                "Save Meal"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
