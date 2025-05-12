const axios = require("axios");
const config = require("../config/keys");

const googleMapsClient = axios.create({
  baseURL: "https://maps.googleapis.com/maps/api",
  params: {
    key: config.googleMapsApiKey,
  },
});

/**
 * Retrieves mosque details from Google Places API.
 * @param {string} query - The search query (e.g., "mosque in London").
 * @returns {Promise<Array>} - A promise that resolves with an array of mosque details.
 */
exports.getMosquesFromGoogle = async (query) => {
  try {
    const response = await googleMapsClient.get("/place/textsearch/json", {
      params: {
        query: query,
      },
    });

    if (response.data.status !== "OK") {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    // Extract relevant information from the response
    const mosques = response.data.results.map((place) => ({
      name: place.name,
      address: place.formatted_address,
      location: {
        type: "Point",
        coordinates: [place.geometry.location.lng, place.geometry.location.lat],
      },
      placeId: place.place_id, // Store Place ID
    }));
    return mosques;
  } catch (error) {
    console.error("Error fetching mosques from Google Maps:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Retrieves place details from Google Places API using place ID.
 * @param {string} placeId - The Place ID.
 * @returns {Promise<Object>} - A promise that resolves with place details.
 */
exports.getPlaceDetails = async (placeId) => {
  try {
    const response = await googleMapsClient.get("/place/details/json", {
      params: {
        place_id: placeId,
        fields: "name,formatted_address,geometry", // Specify the fields you need
      },
    });

    if (response.data.status !== "OK") {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }
    const place = response.data.result;
    return {
      name: place.name,
      address: place.formatted_address,
      location: {
        type: "Point",
        coordinates: [place.geometry.location.lng, place.geometry.location.lat],
      },
    };
  } catch (error) {
    console.error("Error fetching place details from Google Maps:", error);
    throw error;
  }
};
