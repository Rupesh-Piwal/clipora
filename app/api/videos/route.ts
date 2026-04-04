import { NextResponse } from "next/server";
import { db } from "@/app/db";
import { videos, videoLinks } from "@/app/db/schema";
import { inArray, desc } from "drizzle-orm";
import { fetchLinkPreview } from "@/lib/link-preview";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getPresignedVideoUrl } from "@/lib/s3-server";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoId, description, links } = body;

    console.log("BODY: ", body)

    // 1. Validation
    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description too long (max 500 chars)" },
        { status: 400 },
      );
    }

    if (links && !Array.isArray(links)) {
      return NextResponse.json(
        { error: "Invalid links format" },
        { status: 400 },
      );
    }

    const cleanLinks = (links || [])
      .slice(0, 3)
      .filter((l: string) => l && l.trim().length > 0);


    console.log("CLEAN-LINKS: ", cleanLinks)

    // 2. Verify S3 Object Exists (Sanity Check)
    const objectKey = `videos/${videoId}.webm`;
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: objectKey,
        }),
      );
    } catch {
      return NextResponse.json(
        { error: "Video file not found in storage" },
        { status: 404 },
      );
    }

    // 3. Save Video
    await db.insert(videos).values({
      id: videoId,
      objectKey,
      description: description || null,
    });

    // 4. Process & Save Links
    if (cleanLinks.length > 0) {
      const previewPromises = cleanLinks.map((url: string) =>
        fetchLinkPreview(url),
      );
      const previews = await Promise.all(previewPromises);

      console.log("PREVIEWS: ", previews)

      const linkInserts = previews.map((preview, index) => ({
        id: crypto.randomUUID(),
        videoId,
        url: preview.url,
        title: preview.title || null,
        description: preview.description || null,
        image: preview.image || null,
        site: preview.site || null,
        previewFailed: preview.failed || false,
        order: String(index),
      }));

      console.log("LINK-INSERTS: ", linkInserts)

      await db.insert(videoLinks).values(linkInserts);
    }

    return NextResponse.json({ success: true, shareUrl: `/v/${videoId}` });
  } catch (error) {
    console.error("Save metadata error:", error);
    return NextResponse.json(
      { error: "Failed to save metadata" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json({ videos: [] });
    }

    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ videos: [] });
    }

    // Process logic here: query db
    const userVideos = await db
        .select()
        .from(videos)
        .where(inArray(videos.id, ids))
        .orderBy(desc(videos.createdAt));

    // Resolve presigned URLs for client playback
    const videosWithUrls = await Promise.all(userVideos.map(async (v) => {
      const url = await getPresignedVideoUrl(v.objectKey);
      return { ...v, videoUrl: url };
    }));

    return NextResponse.json({ videos: videosWithUrls });
  } catch (error) {
    console.error("Fetch batch videos error:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 },
    );
  }
}
