import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { format, parseISO, subDays } from "date-fns";
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

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Get meals from the last 14 days
      const startDate = subDays(new Date(), 14);

      const [mealsResponse, profileResponse] = await Promise.all([
        supabase
          .from("meals")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true }),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
      ]);

      if (mealsResponse.error) throw mealsResponse.error;
      if (profileResponse.error) throw profileResponse.error;

      console.log("Profile data:", profileResponse.data); // Debug log

      // Group meals by date and calculate daily totals
      const dailyTotals = mealsResponse.data.reduce((acc, meal) => {
        const date = format(parseISO(meal.created_at), "MMM d");
        if (!acc[date]) {
          acc[date] = {
            date,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
          };
        }
        acc[date].calories += meal.calories;
        acc[date].protein += meal.protein;
        acc[date].carbs += meal.carbs;
        acc[date].fats += meal.fats;
        return acc;
      }, {});

      setDailyData(Object.values(dailyTotals));
      setProfile(profileResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const target = profile?.[`target_${data.dataKey}`];

      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Actual: {data.value}
            {data.unit}
          </p>
          {target && (
            <p className="text-sm text-gray-600">
              Target: {target}
              {data.unit}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        value: PropTypes.number,
        unit: PropTypes.string,
        dataKey: PropTypes.string,
      })
    ),
    label: PropTypes.string,
  };

  const ChartCard = ({ title, data, dataKey, color, unit = "g" }) => {
    const targetKey = `target_${dataKey}`;
    const target = profile?.[targetKey];

    // Calculate the domain for YAxis
    const maxValue = Math.max(
      ...data.map((item) => item[dataKey]),
      target || 0
    );
    const minValue = 0; // Start from 0 for better visualization
    const domainMax = Math.ceil(maxValue * 1.1); // Add 10% padding

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {target && (
            <span className="text-sm text-gray-500">
              Target: {target}
              {unit}
            </span>
          )}
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, bottom: 5, left: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
              <YAxis
                domain={[minValue, domainMax]}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              {target && (
                <ReferenceLine
                  y={target}
                  stroke={color}
                  strokeDasharray="5 5"
                  label={{
                    value: `Target: ${target}${unit}`,
                    fill: color,
                    fontSize: 12,
                    position: "right",
                  }}
                  opacity={0.7}
                />
              )}
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2 }}
                unit={unit}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  ChartCard.propTypes = {
    title: PropTypes.string.isRequired,
    data: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.string.isRequired,
        calories: PropTypes.number,
        protein: PropTypes.number,
        carbs: PropTypes.number,
        fats: PropTypes.number,
      })
    ).isRequired,
    dataKey: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    unit: PropTypes.string,
  };

  ChartCard.defaultProps = {
    unit: "g",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 p-4 rounded-md">
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
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!profile?.target_calories && (
        <div className="mb-6 bg-yellow-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No targets set
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Visit your{" "}
                  <a
                    href="/profile"
                    className="font-medium underline hover:text-yellow-600"
                  >
                    profile page
                  </a>{" "}
                  to set your nutrition targets.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Daily Calories"
          data={dailyData}
          dataKey="calories"
          color="#4f46e5"
          unit="kcal"
        />
        <ChartCard
          title="Daily Protein"
          data={dailyData}
          dataKey="protein"
          color="#16a34a"
          unit="g"
        />
        <ChartCard
          title="Daily Carbs"
          data={dailyData}
          dataKey="carbs"
          color="#ca8a04"
          unit="g"
        />
        <ChartCard
          title="Daily Fats"
          data={dailyData}
          dataKey="fats"
          color="#ea580c"
          unit="g"
        />
      </div>

      {dailyData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No data available. Start logging meals to see your nutrition trends!
          </p>
        </div>
      )}
    </div>
  );
}
