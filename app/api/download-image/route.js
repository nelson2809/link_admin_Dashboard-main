// app/api/download-image/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const filename = searchParams.get('filename') || 'document';

    if (!url) {
      return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
    }

    // Fetch the image from Firebase Storage
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the image as a buffer
    const imageBuffer = await response.arrayBuffer();
    
    // Determine content type from the original response or default
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Get file extension from URL or content type
    let fileExtension = 'jpg';
    if (url.includes('.pdf')) fileExtension = 'pdf';
    else if (url.includes('.png')) fileExtension = 'png';
    else if (url.includes('.jpeg') || url.includes('.jpg')) fileExtension = 'jpg';
    else if (contentType.includes('pdf')) fileExtension = 'pdf';
    else if (contentType.includes('png')) fileExtension = 'png';
    
    // Create response with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}.${fileExtension}"`,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file', details: error.message },
      { status: 500 }
    );
  }
}
