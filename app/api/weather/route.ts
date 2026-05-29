// ============================================================
// 天气查询 API
// 通过 OpenWeatherMap 获取指定城市天气
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface WeatherResponse {
  city: string;
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  weatherMain: string; // Clear, Rain, Snow, Clouds etc.
}

// 常用城市列表（中文名 → OpenWeatherMap city ID 或 q 参数）
const CITY_MAP: Record<string, string> = {
  '北京': 'Beijing',
  '上海': 'Shanghai',
  '广州': 'Guangzhou',
  '深圳': 'Shenzhen',
  '成都': 'Chengdu',
  '重庆': 'Chongqing',
  '杭州': 'Hangzhou',
  '武汉': 'Wuhan',
  '西安': "Xi'an",
  '南京': 'Nanjing',
  '长沙': 'Changsha',
  '天津': 'Tianjin',
  '苏州': 'Suzhou',
  '郑州': 'Zhengzhou',
  '昆明': 'Kunming',
  '贵阳': 'Guiyang',
  '厦门': 'Xiamen',
  '青岛': 'Qingdao',
  '大连': 'Dalian',
  '济南': 'Jinan',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || 'Chengdu';
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      // 无 API Key 时返回默认天气
      return NextResponse.json({
        success: true,
        data: {
          city,
          temp: 22,
          feelsLike: 22,
          description: '晴',
          icon: '01d',
          humidity: 50,
          weatherMain: 'Clear',
        } as WeatherResponse,
        fallback: true,
        message: '未配置天气 API Key，使用默认天气',
      });
    }

    // 中文城市名转英文
    const cityQuery = CITY_MAP[city] || city;

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityQuery)},cn&appid=${apiKey}&units=metric&lang=zh_cn`;

    const response = await fetch(url, { next: { revalidate: 1800 } }); // 缓存30分钟

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    const result: WeatherResponse = {
      city: data.name || city,
      temp: Math.round(data.main?.temp || 0),
      feelsLike: Math.round(data.main?.feels_like || 0),
      description: data.weather?.[0]?.description || '未知',
      icon: data.weather?.[0]?.icon || '01d',
      humidity: data.main?.humidity || 0,
      weatherMain: data.weather?.[0]?.main || 'Clear',
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[/api/weather] Error:', error);
    return NextResponse.json(
      {
        success: false,
        data: {
          city: '成都',
          temp: 22,
          feelsLike: 22,
          description: '晴',
          icon: '01d',
          humidity: 50,
          weatherMain: 'Clear',
        } as WeatherResponse,
        fallback: true,
        error: '天气获取失败，使用默认天气',
      },
      { status: 200 }, // 返回 200 以降级处理
    );
  }
}