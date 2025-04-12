import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { format, subDays } from "date-fns";
import PropTypes from "prop-types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [profile, setProfile] = useState(null);
  const [dateRange, setDateRange] = useState(7); // Default to 7 days

  useEffect(() => {
    fetchData();
    fetchProfile();
  }, [dateRange]);

  const fetchProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err.message);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = format(subDays(new Date(), dateRange), "yyyy-MM-dd");
      const { data: meals, error: mealsError } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate)
        .order("created_at", { ascending: true });

      if (mealsError) throw mealsError;

      // Process data for charts
      const processedData = processData(meals);
      setData(processedData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processData = (meals) => {
    const dailyData = {};

    meals.forEach((meal) => {
      const date = meal.created_at.split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          meals: 0,
        };
      }

      dailyData[date].calories += meal.calories || 0;
      dailyData[date].protein += meal.protein || 0;
      dailyData[date].carbs += meal.carbs || 0;
      dailyData[date].fats += meal.fats || 0;
      dailyData[date].meals += 1;
    });

    return Object.values(dailyData);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const target = profile?.[`target_${payload[0].dataKey}`];

    return (
      <div className="bg-white p-4 shadow-lg rounded-lg border">
        <p className="font-medium">{format(new Date(label), "MMM d, yyyy")}</p>
        <p className="text-sm text-gray-600">Meals: {data.meals}</p>
        {payload.map((entry) => (
          <p
            key={entry.dataKey}
            className="text-sm"
            style={{ color: entry.color }}
          >
            {entry.dataKey.charAt(0).toUpperCase() + entry.dataKey.slice(1)}:{" "}
            {entry.value.toFixed(1)}
            {target && (
              <span
                className={`ml-2 ${
                  entry.value > target ? "text-red-500" : "text-green-500"
                }`}
              >
                ({((entry.value / target) * 100).toFixed(0)}% of target)
              </span>
            )}
          </p>
        ))}
      </div>
    );
  };

  CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.arrayOf(
      PropTypes.shape({
        dataKey: PropTypes.string,
        value: PropTypes.number,
        color: PropTypes.string,
        payload: PropTypes.shape({
          meals: PropTypes.number,
        }),
      })
    ),
    label: PropTypes.string,
  };

  const renderChart = (dataKey, color, unit) => {
    const target = profile?.[`target_${dataKey}`];

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Daily {dataKey.charAt(0).toUpperCase() + dataKey.slice(1)}
            {target && (
              <span className="text-sm text-gray-500 ml-2">
                Target: {target} {unit}
              </span>
            )}
          </h3>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(new Date(date), "MMM d")}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              {target && (
                <ReferenceLine
                  y={target}
                  stroke={color}
                  strokeDasharray="3 3"
                  label={{
                    value: `Target: ${target}`,
                    fill: color,
                    fontSize: 12,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!profile?.target_calories && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon
                className="h-5 w-5 text-yellow-400"
                aria-hidden="true"
              />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Set Your Nutrition Targets
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Visit your profile page to set your daily nutrition targets.
                  This will help you track your progress more effectively.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderChart("calories", "#4F46E5", "kcal")}
        {renderChart("protein", "#10B981", "g")}
        {renderChart("carbs", "#F59E0B", "g")}
        {renderChart("fats", "#EF4444", "g")}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon
                className="h-5 w-5 text-red-400"
                aria-hidden="true"
              />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
