import CreateRenderer from "@geekmagic-react/create-renderer.js";
import { Box, ImageBox, TtfText, Text } from "@geekmagic-react/elements.js";
import { cn } from "@geekmagic-react/tailbreeze.js";
import { config } from "dotenv";
import { useEffect, useState } from "react";

type WeatherUnits = "standard" | "metric" | "imperial";

type CurrentWeather = {
	conditionId: number;
	humidity: number;
	tempMax: number;
	windSpeed: number;
	windDirection?: number;
	timezoneOffset: number;
};

type ForecastItemData = {
	conditionId: number;
	timestamp: number;
};

type WeatherData = {
	current: CurrentWeather;
	forecast: ForecastItemData[];
	units: WeatherUnits;
};

type WeatherState =
	| { status: "loading" }
	| { status: "error" }
	| { status: "ready"; data: WeatherData };

const pad = (value: number) => value.toString().padStart(2, "0");

function formatTime(date: Date) {
	return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date) {
	const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
	const month = date.toLocaleDateString("en-US", { month: "short" });
	return `${weekday}, ${month} ${date.getDate()}`.toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
	const value = record[key];
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`OpenWeatherMap response is missing a valid ${key}.`);
	}
	return value;
}

function firstConditionId(value: unknown): number {
	if (!Array.isArray(value) || !isRecord(value[0])) {
		throw new Error("OpenWeatherMap response is missing a weather condition.");
	}
	return requiredNumber(value[0], "id");
}

function parseCurrentWeather(value: unknown): CurrentWeather {
	if (
		!isRecord(value) ||
		!isRecord(value["main"]) ||
		!isRecord(value["wind"])
	) {
		throw new Error(
			"OpenWeatherMap returned an invalid current weather response.",
		);
	}

	const windDirection = value["wind"]["deg"];
	if (windDirection !== undefined && typeof windDirection !== "number") {
		throw new Error("OpenWeatherMap response has an invalid wind direction.");
	}

	return {
		conditionId: firstConditionId(value["weather"]),
		humidity: requiredNumber(value["main"], "humidity"),
		tempMax: requiredNumber(value["main"], "temp_max"),
		windSpeed: requiredNumber(value["wind"], "speed"),
		...(typeof windDirection === "number" ? { windDirection } : {}),
		timezoneOffset: requiredNumber(value, "timezone"),
	};
}

function parseForecast(value: unknown): ForecastItemData[] {
	if (!isRecord(value) || !Array.isArray(value["list"])) {
		throw new Error("OpenWeatherMap returned an invalid forecast response.");
	}

	return value["list"].map((entry: unknown) => {
		if (!isRecord(entry)) {
			throw new Error("OpenWeatherMap returned an invalid forecast item.");
		}
		return {
			conditionId: firstConditionId(entry["weather"]),
			timestamp: requiredNumber(entry, "dt"),
		};
	});
}

function getWeatherIcon(conditionId: number) {
	switch (true) {
		case conditionId >= 200 && conditionId < 300:
			return "example_assets/weather/cl-lght.png";
		case conditionId >= 300 && conditionId < 400:
			return "example_assets/weather/cl-mn-rain.png";
		case conditionId >= 500 && conditionId < 600:
			return "example_assets/weather/cl-rain.png";
		case conditionId >= 600 && conditionId < 700:
			return "example_assets/weather/cl-hail.png";
		case conditionId >= 700 && conditionId < 800:
			return "example_assets/weather/wnd.png";
		case conditionId === 800:
			return "example_assets/weather/sun.png";
		case conditionId === 801:
			return "example_assets/weather/cl-sun.png";
		default:
			return "example_assets/weather/cl.png";
	}
}

function getTemperatureUnit(units: WeatherUnits) {
	if (units === "imperial") return "F";
	if (units === "standard") return "K";
	return "C";
}

function formatWindSpeed(speed: number, units: WeatherUnits) {
	if (units === "imperial") return `${Math.round(speed)} mph`;
	if (units === "standard") return `${Math.round(speed)} m/s`;
	return `${Math.round(speed * 3.6)} km/h`;
}

function formatWindDirection(degrees?: number) {
	if (degrees === undefined) return "--";
	const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
	const index =
		((Math.round(degrees / 45) % directions.length) + directions.length) %
		directions.length;
	return directions[index] ?? "--";
}

function formatForecastHour(timestamp: number, timezoneOffset: number) {
	const localTime = new Date((timestamp + timezoneOffset) * 1000);
	return pad(localTime.getUTCHours());
}

async function requestWeather(url: URL, signal: AbortSignal) {
	const response = await fetch(url, { signal });
	if (!response.ok) {
		throw new Error(
			`OpenWeatherMap request failed with HTTP ${response.status}.`,
		);
	}
	return (await response.json()) as unknown;
}

function useIsOpenWeatherMapConfigured() {
	return Boolean(
		process.env.OPENWEATHERMAP_API_KEY && process.env.OPENWEATHERMAP_LOCATION,
	);
}

function useOpenWeatherMap(): WeatherState {
	const [weather, setWeather] = useState<WeatherState>({ status: "loading" });

	useEffect(() => {
		let active = true;
		let requestController: AbortController | undefined;

		const loadWeather = async () => {
			requestController?.abort();
			const controller = new AbortController();
			requestController = controller;

			try {
				const apiKey = process.env.OPENWEATHERMAP_API_KEY?.trim();
				const location = process.env.OPENWEATHERMAP_LOCATION?.trim();
				const configuredUnits =
					process.env.OPENWEATHERMAP_UNITS?.trim() || "metric";

				if (!apiKey) {
					throw new Error("Set OPENWEATHERMAP_API_KEY in js-client/.env.");
				}
				if (!location) {
					throw new Error("Set OPENWEATHERMAP_LOCATION in js-client/.env.");
				}
				if (
					configuredUnits !== "metric" &&
					configuredUnits !== "imperial" &&
					configuredUnits !== "standard"
				) {
					throw new Error(
						"OPENWEATHERMAP_UNITS must be metric, imperial, or standard.",
					);
				}

				const currentUrl = new URL(
					"https://api.openweathermap.org/data/2.5/weather",
				);
				currentUrl.searchParams.set("q", location);
				currentUrl.searchParams.set("appid", apiKey);
				currentUrl.searchParams.set("units", configuredUnits);

				const forecastUrl = new URL(
					"https://api.openweathermap.org/data/2.5/forecast",
				);
				forecastUrl.searchParams.set("q", location);
				forecastUrl.searchParams.set("appid", apiKey);
				forecastUrl.searchParams.set("units", configuredUnits);

				const [currentResponse, forecastResponse] = await Promise.all([
					requestWeather(currentUrl, controller.signal),
					requestWeather(forecastUrl, controller.signal),
				]);

				const current = parseCurrentWeather(currentResponse);
				const forecast = parseForecast(forecastResponse)
					.filter((item) => item.timestamp > Date.now() / 1000)
					.slice(0, 4);

				if (active) {
					setWeather({
						status: "ready",
						data: {
							current,
							forecast,
							units: configuredUnits,
						},
					});
				}
			} catch (error) {
				if (!active || controller.signal.aborted) return;
				console.error("Unable to load OpenWeatherMap data:", error);
				setWeather({ status: "error" });
			}
		};

		void loadWeather();
		const refreshTimer = setInterval(() => void loadWeather(), 10 * 60 * 1000);

		return () => {
			active = false;
			clearInterval(refreshTimer);
			requestController?.abort();
		};
	}, []);

	return weather;
}

function TitleBar(props: { current: CurrentWeather | undefined }) {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	return (
		<Box tb="flex justify-between items-center p-[2] gap-[10] flex-row w-full">
			<ImageBox
				src={
					props.current
						? getWeatherIcon(props.current.conditionId)
						: "example_assets/weather/cl.png"
				}
				height={80}
				width={80}
				colorDepth={8}
			/>
			<Box tb="flex flex-col items-center">
				<TtfText fontPath="example_assets/raw_fonts/Orienta.ttf" fontSize={50}>
					{formatTime(now)}
				</TtfText>
				<TtfText fontPath="example_assets/raw_fonts/Orienta.ttf" fontSize={15}>
					{formatDate(now)}
				</TtfText>
			</Box>
		</Box>
	);
}

function ForecastItem(props: { icon: string; hour: string }) {
	return (
		<Box tb="flex items-center justify-center gap-[2] flex-col">
			<ImageBox src={props.icon} height={30} width={30} colorDepth={8} />
			<TtfText fontPath="example_assets/raw_fonts/Orienta.ttf" fontSize={15}>
				{props.hour}
			</TtfText>
		</Box>
	);
}

function WeatherWidget(props: { weather: WeatherData | null }) {
	const forecasts = props.weather?.forecast ?? [];
	const items = Array.from({ length: 4 }, (_, index) => forecasts[index]);

	return (
		<Box tb="flex w-full flex-row gap-[20] justify-center">
			{items.map((forecast, index) => (
				<ForecastItem
					icon={
						forecast
							? getWeatherIcon(forecast.conditionId)
							: "example_assets/weather/cl.png"
					}
					hour={
						forecast && props.weather
							? formatForecastHour(
									forecast.timestamp,
									props.weather.current.timezoneOffset,
								)
							: "--"
					}
				/>
			))}
		</Box>
	);
}

function WeatherAttribute(props: { icon: string; value: string }) {
	return (
		<Box tb="flex items-center justify-center gap-[2] flex-col">
			<ImageBox src={props.icon} height={20} width={20} colorDepth={8} />
			<TtfText fontPath="example_assets/raw_fonts/Orienta.ttf" fontSize={15}>
				{props.value}
			</TtfText>
		</Box>
	);
}

function WeatherAttributesRow(props: { weather: WeatherData | null }) {
	const current = props.weather?.current;
	const units = props.weather?.units ?? "metric";
	const temperatureUnit = getTemperatureUnit(units);

	return (
		<Box tb="flex w-full flex-row gap-[20] justify-center">
			<WeatherAttribute
				icon="example_assets/weather/drp.png"
				value={current ? `${Math.round(current.humidity)}%` : "--"}
			/>
			<WeatherAttribute
				icon="example_assets/weather/sun.png"
				value={
					current ? `${Math.round(current.tempMax)} ${temperatureUnit}` : "--"
				}
			/>
			<WeatherAttribute
				icon="example_assets/weather/wnd.png"
				value={current ? formatWindSpeed(current.windSpeed, units) : "--"}
			/>
			<WeatherAttribute
				icon="example_assets/weather/cmpss.png"
				value={formatWindDirection(current?.windDirection)}
			/>
		</Box>
	);
}

function Separator() {
	return <Box tb="h-[3] w-full bg-[#161616]" />;
}

function App() {
	const weather = useOpenWeatherMap();
	const weatherData = weather.status === "ready" ? weather.data : null;

	const configured = useIsOpenWeatherMapConfigured();
	if (!configured) {
		return (
			<Box tb="flex w-full h-full items-center justify-center">
				<Text>OpenWeatherMap is not configured</Text>
			</Box>
		);
	}

	return (
		<Box
			tb={cn(
				"flex flex-col items-start",
				"p-[15] w-full h-full gap-[8]",
				"bg-[#000] text-[#fff]",
			)}
		>
			<TitleBar current={weatherData?.current} />
			<Separator />
			<WeatherWidget weather={weatherData} />
			<Separator />
			<WeatherAttributesRow weather={weatherData} />
		</Box>
	);
}

config();
const [renderer, render] = await CreateRenderer({
	host: process.env.DISPLAY_ADDRESS as string,
	port: 81,
});

// await renderer.WipeAssetsAsync();
render(<App />);
