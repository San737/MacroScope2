import { useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/library";
import {
  XMarkIcon,
  ArrowPathIcon,
  QrCodeIcon,
  SparklesIcon,
  PencilSquareIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";

const NUTRITION_DB = {
  AlooGobi: {
    calories: 172,
    protein: 4.3,
    carbohydrates: 18.5,
    fats: 10.2,
    weight: 150,
  },
  AlooMasala: {
    calories: 195,
    protein: 3.8,
    carbohydrates: 25.6,
    fats: 9.5,
    weight: 175,
  },
  Bhatura: {
    calories: 330,
    protein: 7.5,
    carbohydrates: 52.0,
    fats: 12.5,
    weight: 100,
  },
  BhindiMasala: {
    calories: 158,
    protein: 3.2,
    carbohydrates: 14.8,
    fats: 11.0,
    weight: 150,
  },
  Biryani: {
    calories: 350,
    protein: 12.0,
    carbohydrates: 45.0,
    fats: 12.0,
    weight: 250,
  },
  Chai: {
    calories: 85,
    protein: 2.5,
    carbohydrates: 10.5,
    fats: 3.8,
    weight: 150,
  },
  Chole: {
    calories: 210,
    protein: 9.0,
    carbohydrates: 30.5,
    fats: 7.0,
    weight: 175,
  },
  CoconutChutney: {
    calories: 175,
    protein: 2.0,
    carbohydrates: 8.5,
    fats: 16.0,
    weight: 50,
  },
  Dal: {
    calories: 116,
    protein: 9.0,
    carbohydrates: 20.0,
    fats: 0.4,
    weight: 175,
  },
  Dosa: {
    calories: 133,
    protein: 2.6,
    carbohydrates: 25.0,
    fats: 1.9,
    weight: 90,
  },
  DumAloo: {
    calories: 210,
    protein: 4.0,
    carbohydrates: 28.0,
    fats: 10.0,
    weight: 180,
  },
  FishCurry: {
    calories: 195,
    protein: 20.0,
    carbohydrates: 12.0,
    fats: 8.5,
    weight: 200,
  },
  Ghevar: {
    calories: 310,
    protein: 5.0,
    carbohydrates: 45.0,
    fats: 12.0,
    weight: 100,
  },
  GreenChutney: {
    calories: 45,
    protein: 2.0,
    carbohydrates: 6.5,
    fats: 1.5,
    weight: 30,
  },
  GulabJamun: {
    calories: 320,
    protein: 4.0,
    carbohydrates: 45.0,
    fats: 14.0,
    weight: 100,
  },
  Idli: {
    calories: 39,
    protein: 2.0,
    carbohydrates: 7.0,
    fats: 0.2,
    weight: 40,
  },
  Jalebi: {
    calories: 328,
    protein: 3.0,
    carbohydrates: 55.0,
    fats: 12.0,
    weight: 100,
  },
  Kebab: {
    calories: 285,
    protein: 22.0,
    carbohydrates: 8.0,
    fats: 18.5,
    weight: 150,
  },
  Kheer: {
    calories: 255,
    protein: 7.0,
    carbohydrates: 40.0,
    fats: 8.0,
    weight: 200,
  },
  Kulfi: {
    calories: 220,
    protein: 5.0,
    carbohydrates: 25.0,
    fats: 12.0,
    weight: 90,
  },
  Lassi: {
    calories: 150,
    protein: 6.0,
    carbohydrates: 28.0,
    fats: 2.0,
    weight: 250,
  },
  MuttonCurry: {
    calories: 240,
    protein: 25.0,
    carbohydrates: 12.0,
    fats: 12.0,
    weight: 200,
  },
  OnionPakoda: {
    calories: 230,
    protein: 6.0,
    carbohydrates: 22.0,
    fats: 14.0,
    weight: 100,
  },
  PalakPaneer: {
    calories: 275,
    protein: 16.0,
    carbohydrates: 12.5,
    fats: 18.0,
    weight: 175,
  },
  Poha: {
    calories: 180,
    protein: 3.5,
    carbohydrates: 35.0,
    fats: 3.0,
    weight: 150,
  },
  RajmaCurry: {
    calories: 195,
    protein: 10.0,
    carbohydrates: 28.0,
    fats: 5.0,
    weight: 175,
  },
  RasMalai: {
    calories: 230,
    protein: 8.0,
    carbohydrates: 28.0,
    fats: 10.0,
    weight: 120,
  },
  Samosa: {
    calories: 262,
    protein: 4.0,
    carbohydrates: 30.0,
    fats: 13.0,
    weight: 80,
  },
  ShahiPaneer: {
    calories: 310,
    protein: 17.0,
    carbohydrates: 15.0,
    fats: 22.0,
    weight: 175,
  },
  WhiteRice: {
    calories: 130,
    protein: 2.7,
    carbohydrates: 28.0,
    fats: 0.3,
    weight: 150,
  },
};

const getNutritionInfo = (foodItem) => {
  const caseInsensitiveDb = Object.fromEntries(
    Object.entries(NUTRITION_DB).map(([k, v]) => [k.toLowerCase(), v])
  );
  return caseInsensitiveDb[foodItem.toLowerCase()];
};

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
      if (mode === "advanced") {
        // Handle advanced recognition with Gemini
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

        // Call Gemini API directly
        const base64Data = compressedImage.split(",")[1];
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${
              import.meta.env.VITE_GEMINI_API_KEY
            }`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `Analyze this food image carefully and identify all visible food items.
                        For each item:
                        1. Identify the food name accurately
                        2. Estimate the portion size based on visual cues (use standard units like grams, cups, pieces)
                        3. Calculate the approximate nutritional information based on the identified portion

                        Return structured data in this exact JSON format:
                        {
                          "items": [
                            {
                              "name": "food name",
                              "quantity": "estimated quantity with unit",
                              "calories": numeric value,
                              "protein": numeric value in grams,
                              "carbs": numeric value in grams,
                              "fat": numeric value in grams
                            }
                          ],
                          "total": {
                            "calories": sum of all item calories,
                            "protein": sum of all protein in grams,
                            "carbs": sum of all carbs in grams,
                            "fat": sum of all fat in grams
                          },
                          "summary": "brief health assessment and nutritional balance of this meal"
                        }`,
                      },
                      {
                        inlineData: {
                          mimeType: "image/jpeg",
                          data: base64Data,
                        },
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              `Gemini API error: ${response.statusText}. ${
                errorData.error?.message || ""
              }`
            );
          }

          const responseData = await response.json();
          console.log("Gemini raw response:", responseData);

          // Extract JSON from the text response
          const textResponse = responseData.candidates[0].content.parts[0].text;
          const jsonMatch = textResponse.match(/{[\s\S]*}/);

          if (!jsonMatch) {
            throw new Error(
              "Failed to extract structured data from AI response"
            );
          }

          const result = JSON.parse(jsonMatch[0]);
          console.log("Parsed Gemini result:", result);

          if (!result.items || result.items.length === 0) {
            throw new Error("No food items detected in the image");
          }

          // Set scan result with Gemini data
          setScanResult({
            type: "advanced",
            items: result.items,
            totalNutrients: result.total,
            summary: result.summary,
          });

          // Auto-fill the form with total nutritional data
          setFormData((prev) => ({
            ...prev,
            calories: Math.round(result.total.calories),
            protein: Math.round(result.total.protein),
            carbs: Math.round(result.total.carbs),
            fats: Math.round(result.total.fat),
            notes: `AI Analysis Summary:\n${
              result.summary
            }\n\nDetected Items:\n${result.items
              .map((item) => `- ${item.name} (${item.quantity})`)
              .join("\n")}`,
          }));
        } catch (error) {
          console.error("Gemini API error:", error);
          throw new Error(
            `Failed to analyze image with Gemini: ${error.message}`
          );
        }
      } else if (mode === "barcode") {
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
        // Handle food recognition
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

              // Convert to base64 with JPEG format
              resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(imageFile);
        });

        // Call Roboflow API with base64 image data
        const base64Data = compressedImage.split(",")[1];
        const response = await fetch(
          "https://serverless.roboflow.com/infer/workflows/myworkspace-yqb7k/custom-workflow-2",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: "QsQI7bVRFwg707v9MsQJ",
              inputs: {
                image: { type: "base64", value: base64Data },
              },
            }),
          }
        );

        const result = await response.json();
        console.log("Roboflow result:", result);

        if (result.error) {
          throw new Error(
            `Recognition failed: ${result.message || "Unknown error"}`
          );
        }

        // Get the predicted food items from the result
        const predictions = result.outputs?.[0]?.predictions?.predictions;
        if (!predictions || predictions.length === 0) {
          throw new Error("No food items recognized in the image");
        }

        // Sort predictions by confidence and filter out low confidence predictions
        const validPredictions = predictions
          .filter((pred) => pred.confidence > 0.5) // Only keep predictions with >50% confidence
          .sort((a, b) => b.confidence - a.confidence);

        if (validPredictions.length === 0) {
          throw new Error(
            "No food items recognized with sufficient confidence"
          );
        }

        // Calculate combined nutritional values
        const recognizedItems = [];
        let totalNutrients = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
        };

        for (const prediction of validPredictions) {
          const foodItem = prediction.class;
          const nutritionInfo = getNutritionInfo(foodItem);

          if (nutritionInfo) {
            recognizedItems.push({
              name: foodItem,
              confidence: Math.round(prediction.confidence * 100),
              nutrients: {
                calories: Math.round(nutritionInfo.calories),
                protein: Math.round(nutritionInfo.protein),
                carbs: Math.round(nutritionInfo.carbohydrates),
                fats: Math.round(nutritionInfo.fats),
                weight: nutritionInfo.weight,
              },
            });

            totalNutrients.calories += Math.round(nutritionInfo.calories);
            totalNutrients.protein += Math.round(nutritionInfo.protein);
            totalNutrients.carbs += Math.round(nutritionInfo.carbohydrates);
            totalNutrients.fats += Math.round(nutritionInfo.fats);
          }
        }

        if (recognizedItems.length === 0) {
          throw new Error(
            "Could not find nutritional information for any recognized items"
          );
        }

        setScanResult({
          type: "recognition",
          items: recognizedItems,
          totalNutrients: totalNutrients,
        });

        // Auto-fill the form with combined nutritional data
        setFormData((prev) => ({
          ...prev,
          calories: totalNutrients.calories,
          protein: totalNutrients.protein,
          carbs: totalNutrients.carbs,
          fats: totalNutrients.fats,
          notes: `Recognized foods:\n${recognizedItems
            .map(
              (item) =>
                `- ${item.name} (${item.confidence}% confidence, ${item.nutrients.weight}g serving)`
            )
            .join("\n")}`,
        }));
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
                      : scanResult.type === "advanced"
                      ? "AI Analysis Results"
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
                  ) : scanResult.type === "advanced" ? (
                    <div>
                      <div className="space-y-3">
                        {scanResult.items.map((item, index) => (
                          <div
                            key={index}
                            className="border-b border-gray-200 pb-2 last:border-b-0"
                          >
                            <p className="text-sm text-gray-600">
                              {item.name}{" "}
                              <span className="text-indigo-600 font-medium">
                                ({item.quantity})
                              </span>
                            </p>
                            <div className="mt-1 grid grid-cols-4 gap-2 text-xs text-gray-500">
                              <p>Calories: {Math.round(item.calories)}kcal</p>
                              <p>Protein: {Math.round(item.protein)}g</p>
                              <p>Carbs: {Math.round(item.carbs)}g</p>
                              <p>Fat: {Math.round(item.fat)}g</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          Total Nutritional Values:
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <p>
                            Calories:{" "}
                            {Math.round(scanResult.totalNutrients.calories)}kcal
                          </p>
                          <p>
                            Protein:{" "}
                            {Math.round(scanResult.totalNutrients.protein)}g
                          </p>
                          <p>
                            Carbs: {Math.round(scanResult.totalNutrients.carbs)}
                            g
                          </p>
                          <p>
                            Fat: {Math.round(scanResult.totalNutrients.fat)}g
                          </p>
                        </div>
                        {scanResult.summary && (
                          <p className="mt-3 text-xs text-gray-600 italic">
                            {scanResult.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="space-y-3">
                        {scanResult.items.map((item, index) => (
                          <div
                            key={index}
                            className="border-b border-gray-200 pb-2 last:border-b-0"
                          >
                            <p className="text-sm text-gray-600">
                              {item.name}{" "}
                              <span className="text-indigo-600 font-medium">
                                ({item.confidence}% confidence)
                              </span>
                            </p>
                            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <p>Calories: {item.nutrients.calories}kcal</p>
                              <p>Protein: {item.nutrients.protein}g</p>
                              <p>Carbs: {item.nutrients.carbs}g</p>
                              <p>Fats: {item.nutrients.fats}g</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          Total Nutritional Values:
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <p>
                            Calories: {scanResult.totalNutrients.calories}kcal
                          </p>
                          <p>Protein: {scanResult.totalNutrients.protein}g</p>
                          <p>Carbs: {scanResult.totalNutrients.carbs}g</p>
                          <p>Fats: {scanResult.totalNutrients.fats}g</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-2 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setScanMode("photo");
                    startCamera();
                  }}
                  className="flex-1 flex items-center justify-center px-2 sm:px-4 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilSquareIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add</span> Manually
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanMode("barcode");
                    startCamera();
                  }}
                  className="flex-1 flex items-center justify-center px-2 sm:px-4 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <QrCodeIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Scan</span> Barcode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanMode("recognition");
                    startCamera();
                  }}
                  className="flex-1 flex items-center justify-center px-2 sm:px-4 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Quick</span> Scan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanMode("advanced");
                    startCamera();
                  }}
                  className="flex-1 flex items-center justify-center px-2 sm:px-4 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <BeakerIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">AI</span> Analysis
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
