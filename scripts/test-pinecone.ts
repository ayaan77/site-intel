
const API_KEY = "pcsk_3MT378_Qg8wFJCFABAGezs9iEAQH8fQE1ox2hjCHNbCakAJi9Q5boyHi3jxx35DZZSY29z";

async function testPinecone() {
    console.log("Testing Pinecone API Key...");

    try {
        const response = await fetch("https://api.pinecone.io/indexes", {
            method: "GET",
            headers: {
                "Api-Key": API_KEY,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Error ${response.status}: ${response.statusText}`);
            console.error("Details:", text);
            process.exit(1);
        }

        const data = await response.json();
        console.log("Success! Authenticated with Pinecone.");
        console.log("Indexes found:", data.indexes?.length || 0);
        if (data.indexes?.length > 0) {
            console.log("Index names:", data.indexes.map((i: any) => i.name).join(", "));
        }
    } catch (error) {
        console.error("Network error:", error);
        process.exit(1);
    }
}

testPinecone();
