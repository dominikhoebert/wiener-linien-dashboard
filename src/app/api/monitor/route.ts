import type { NextRequest } from "next/server";
import { parseData } from "@/utils/parseData";
import { Welcome } from "@/types";
import { MAX_COUNTDOWN_MINUTES } from "@/constants";

export const runtime = "edge";

const API_BASE_URL: string = "https://www.wienerlinien.at/ogd_realtime/monitor";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.getAll("stopID");
  const query = new URLSearchParams(params.map((id) => ["stopId", id])).toString();

  try {
    const response = await fetch(`${API_BASE_URL}?${query}`, {
      headers: {
        "Accept-Language": "de,en-US;q=0.7,en;q=0.3",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Wiener Linien API request failed: ${response.status}: ${response.statusText}`
      );
    }

    const data: Welcome = await response.json();

    if (data.data?.monitors.length === 0 || data.message.value !== "OK") {
      throw new Error(
        data.data?.monitors.length === 0 && data.message.value === "OK"
          ? "No departures found for the given stopID."
          : `API response: ${data.message.value}`
      );
    }

    let parsedData;
    try {
      parsedData = parseData(data, MAX_COUNTDOWN_MINUTES);
    } catch (error) {
      throw new Error("Real time data not available. 😓🚨");
    }

    return Response.json(parsedData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
