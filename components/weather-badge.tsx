'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';

interface WeatherData {
  city: string;
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  weatherMain: string;
}

interface WeatherBadgeProps {
  city: string;
  onWeatherLoaded?: (weather: WeatherData) => void;
}

const WEATHER_EMOJI: Record<string, string> = {
  Clear: '☀️',
  Clouds: '☁️',
  Rain: '🌧️',
  Drizzle: '🌦️',
  Thunderstorm: '⛈️',
  Snow: '❄️',
  Mist: '🌫️',
  Fog: '🌫️',
  Haze: '🌫️',
};

export function WeatherBadge({ city, onWeatherLoaded }: WeatherBadgeProps) {
  const [weather, setWeather] = React.useState<WeatherData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        const data = await res.json();
        if (data.data) {
          setWeather(data.data);
          onWeatherLoaded?.(data.data);
        }
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    };

    if (city) fetchWeather();
  }, [city, onWeatherLoaded]);

  if (loading) {
    return (
      <Badge variant="secondary" className="text-xs animate-pulse">
        🌤️ 获取天气中…
      </Badge>
    );
  }

  if (!weather) return null;

  const emoji = WEATHER_EMOJI[weather.weatherMain] || '🌤️';

  return (
    <Badge variant="secondary" className="text-xs">
      {emoji} {weather.city} {weather.temp}°C {weather.description}
    </Badge>
  );
}