const start = Date.now();
const key = process.env.CHANNEL3_API_KEY;

if (!key) {
  console.log("CHANNEL3_API_KEY is missing");
  process.exit(1);
}

async function main() {
  try {
    const response = await fetch(
      "https://api.trychannel3.com/v1/search",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
        },
        body: JSON.stringify({
          query: "A lightweight laptop for programming under $800",
          limit: 8,
          filters: {
            availability: ["InStock", "OutOfStock"],
          },
          config: {
            language: "en",
            country: "US",
            currency: "USD",
          },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    console.log("HTTP status:", response.status);
    console.log("Elapsed:", Date.now() - start, "ms");
    console.log("Response:", (await response.text()).slice(0, 3000));
  } catch (error) {
    console.log("Error:", error.name, error.message);
    console.log("Elapsed:", Date.now() - start, "ms");
  }
}

main();
