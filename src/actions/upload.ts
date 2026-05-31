"use server";

import { CloudinesiaClient } from "cloudinesia";

const client = new CloudinesiaClient({
  apiKey: process.env.NEXT_PUBLIC_CLOUDINESIA_API_KEY || "",
});

export async function uploadFile(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    // Server-side size validation (20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error("File size exceeds 20MB limit");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await client.upload(buffer, file.name);
    
    return {
      success: true,
      publicUrl: result.publicUrl,
    };
  } catch (error) {
    console.error("Upload Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Upload failed";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
