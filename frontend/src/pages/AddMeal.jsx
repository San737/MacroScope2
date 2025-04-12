import { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  CameraIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function AddMeal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
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
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    },
  });

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
        setCameraError(err.message);
        setShowCamera(false);
      } finally {
        setIsCameraInitializing(false);
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

  const startCamera = async () => {
    try {
      setCameraError(null);
      setError(null);
      console.log("Starting camera...");

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser");
      }

      setShowCamera(true);
      setIsCameraInitializing(true);
    } catch (err) {
      console.error("Camera start error:", err);
      setCameraError(err.message);
    }
  };

  const stopCamera = () => {
    console.log("Stopping camera...");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError(null);
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
      stopCamera();
    }, "image/jpeg");
  };

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
          calories: Number(formData.calories),
          protein: Number(formData.protein),
          carbs: Number(formData.carbs),
          fats: Number(formData.fats),
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

  const switchCamera = async () => {
    if (streamRef.current) {
      // Stop current stream
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsCameraInitializing(true);
    // Toggle facing mode
    setFacingMode((current) =>
      current === "environment" ? "user" : "environment"
    );
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
              {isCameraInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg z-10">
                  <div className="text-center p-4">
                    <p className="text-red-800 mb-2">Camera Error:</p>
                    <p className="text-red-600">{cameraError}</p>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="mt-4 bg-red-600 text-white px-4 py-2 rounded-full shadow hover:bg-red-700"
                    >
                      Close Camera
                    </button>
                  </div>
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
              <div className="absolute top-4 right-4 z-20">
                <button
                  type="button"
                  onClick={switchCamera}
                  className="bg-gray-800 bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                  disabled={isCameraInitializing}
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4 z-20">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow hover:bg-indigo-700"
                  disabled={isCameraInitializing || cameraError}
                >
                  Take Photo
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
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500"
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
              </div>

              <button
                type="button"
                onClick={startCamera}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <CameraIcon className="h-5 w-5 mr-2" />
                Take Photo
              </button>
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
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              {loading ? "Saving..." : "Save Meal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
