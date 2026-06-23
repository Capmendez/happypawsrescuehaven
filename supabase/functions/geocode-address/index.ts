// supabase/functions/geocode-address/index.ts
//
// Geocodes an address string using the Geocodio API.
//
// Expects a POST body like:
// {
//   "address": "1109 N Highland St, Arlington, VA 22201"
// }
//
// Returns:
// {
//   "latitude": 38.886672,
//   "longitude": -77.094735,
//   "formattedAddress": "1109 N Highland St, Arlington, VA 22201"
// }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEOCODIO_API_KEY = Deno.env.get("GEOCODIO_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEOCODIO_API_KEY) {
      throw new Error("GEOCODIO_API_KEY is not configured inside Supabase secrets.");
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { address } = await req.json();

    if (!address || typeof address !== 'string' || !address.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required field: address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Geocodio endpoint geocodes free text queries
    const geocodioUrl = `https://api.geocod.io/v1.7/geocode?q=${encodeURIComponent(address)}&api_key=${GEOCODIO_API_KEY}`;
    
    console.log(`Geocoding address: ${address}`);
    const response = await fetch(geocodioUrl);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Geocodio error response:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to communicate with geocoding service.", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return new Response(
        JSON.stringify({ error: `Address could not be geocoded: '${address}'. Please provide a more specific US address.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstResult = data.results[0];
    const { lat, lng } = firstResult.location;
    const formattedAddress = firstResult.formatted_address;

    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return new Response(
        JSON.stringify({ error: "Unable to parse valid coordinates for the provided address." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stateCode = firstResult.address_components?.state || null;

    return new Response(
      JSON.stringify({
        latitude: lat,
        longitude: lng,
        formattedAddress,
        state: stateCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("geocode-address function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error occurred during geocoding." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
