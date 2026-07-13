import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin (Only happens once per cold start)
if (!getApps().length) {
  try {
    // Expected to be a base64 encoded JSON string of the service account
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountBase64) {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('ascii'));
      initializeApp({
        credential: cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Error", error);
  }
}

export async function POST(request: Request) {
  try {
    const { tokens, title, body, link } = await request.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'No tokens provided' }, { status: 400 });
    }

    if (!getApps().length) {
      return NextResponse.json({ error: 'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT in .env.local' }, { status: 500 });
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        click_action: link,
      },
      tokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);
    
    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
