import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { emails, title, time, venue, link } = await request.json();

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Proxima <onboarding@resend.dev>', // Resend testing domain
      to: emails,
      subject: `Hangout Confirmed: ${title}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">Plan Confirmed! 🎉</h1>
          <p>The host has finalized the details for <strong>${title}</strong>.</p>
          <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>📍 Venue:</strong> ${venue}</p>
            <p style="margin: 0;"><strong>⏰ Time:</strong> ${new Date(time).toLocaleString()}</p>
          </div>
          <p>Please check the Hangout Hub to view the Host's bank details and transfer your share to secure your spot.</p>
          <a href="${link}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 20px;">
            Open Hangout Hub
          </a>
          <p style="font-size: 12px; color: #71717a; margin-top: 40px;">
            Sent by Proxima - Disconnect to Connect
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
