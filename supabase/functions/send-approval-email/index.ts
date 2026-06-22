// supabase/functions/send-approval-email/index.ts
//
// Sends adoption-related emails to adopters via Resend. Supports four
// email types:
// - 'application_approved': sent when staff approves an application,
//   directs the adopter to the checkout page to submit adoption payment.
// - 'adoption_finalized': sent when staff approves the adoption fee
//   payment proof, directs the adopter to the transport page to choose
//   self-pickup or transport.
// - 'deposit_requested': sent after staff approves a transport fee
//   proof, directs the adopter back to the transport request page to
//   submit the refundable security deposit.
// - 'payment_confirmed': sent when staff approves the security deposit,
//   confirms transport is finalized and shares the tracking ID.
//
// Expects a POST body like:
// {
//   "type": "application_approved" | "adoption_finalized" | "deposit_requested" | "payment_confirmed",
//   "adopterEmail": "jane@example.com",
//   "adopterName": "Jane Doe",
//   "petName": "Luna",
//   "applicationId": "uuid-here",         // required for application_approved
//   "adoptionId": "uuid-here",            // required for adoption_finalized
//   "transportRequestId": "uuid-here",    // required for deposit_requested
//   "trackingId": "HPRH-TRK-2026-0001"    // required for payment_confirmed
// }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body = await req.json();
    const type = body.type ?? "application_approved"; // default for backward compatibility
    const { adopterEmail, adopterName, petName, applicationId, adoptionId, transportRequestId, trackingId } = body;

    if (!adopterEmail || !adopterName || !petName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: adopterEmail, adopterName, petName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject: string;
    let emailHtml: string;
    let fromAddress = "Happy Paws Rescue Haven <adoptions@happypawsrescuehaven.com>";

    if (type === "payment_confirmed") {
      if (!trackingId) {
        return new Response(
          JSON.stringify({ error: "Missing required field for payment_confirmed: trackingId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      fromAddress = "Happy Paws Rescue Haven Transport <transport@happypawsrescuehaven.com>";
      subject = `${petName}'s adoption is finalized! 🎉`;
      emailHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #FBF7EE; color: #1F2A1E;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Congratulations, ${adopterName}!</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            Your payment has been confirmed and <strong>${petName}'s</strong> adoption is now
            officially finalized. Welcome to the family!
          </p>
          <div style="background-color: #F0EADC; border: 1px solid #5C7A5E; border-radius: 6px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #5C7A5E; margin: 0 0 8px;">
              Your Transport Tracking ID
            </p>
            <p style="font-size: 22px; font-family: 'Courier New', monospace; font-weight: bold; color: #C75D3A; margin: 0;">
              ${trackingId}
            </p>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">
            Use this ID to follow ${petName}'s transport progress. Our team will be in touch
            soon with pickup and transport details.
          </p>
          <p style="font-size: 14px; color: #5C7A5E; margin-top: 32px;">
            If you have any questions, just reply to this email — we're happy to help.
          </p>
          <p style="font-size: 14px; color: #5C7A5E; margin-top: 24px;">
            Warmly,<br/>
            Happy Paws Rescue Haven
          </p>
        </div>
      `;
    } else if (type === "deposit_requested") {
      if (!transportRequestId) {
        return new Response(
          JSON.stringify({ error: "Missing required field for deposit_requested: transportRequestId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      fromAddress = "Happy Paws Rescue Haven Transport <transport@happypawsrescuehaven.com>";
      const transportUrl = `${SITE_URL}/transport/request/${transportRequestId}`;
      subject = `One more step for ${petName}'s journey home`;
      emailHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #FBF7EE; color: #1F2A1E;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Great progress, ${adopterName}!</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            We've received and confirmed your transport fee payment for <strong>${petName}</strong>.
            The last step before we can schedule transport is a refundable security deposit.
          </p>
          <a href="${transportUrl}" style="display: inline-block; background-color: #C75D3A; color: #FBF7EE; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-top: 16px;">
            Submit Security Deposit
          </a>
          <p style="font-size: 14px; color: #5C7A5E; margin-top: 32px;">
            This deposit is fully refundable and helps us ensure a smooth handoff. Once it's
            confirmed, you'll receive your tracking ID right away.
          </p>
          <p style="font-size: 14px; color: #5C7A5E; margin-top: 24px;">
            Warmly,<br/>
            Happy Paws Rescue Haven
          </p>
        </div>
      `;
    } else if (type === "adoption_finalized") {
      if (!adoptionId) {
        return new Response(
          JSON.stringify({ error: "Missing required field for adoption_finalized: adoptionId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const transportChoiceUrl = `${SITE_URL}/transport/request/${adoptionId}`;
      subject = `${petName}'s adoption fee is confirmed — next step inside`;
      emailHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #FBF7EE; color: #1F2A1E;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Wonderful news, ${adopterName}!</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            We've confirmed your adoption fee payment for <strong>${petName}</strong>. The adoption
            itself is finalized — now let's get ${petName} home.
          </p>
          <p style="font-size: 16px; line-height: 1.6;">
            Let us know how you'd like to proceed: pick ${petName} up yourself, or have us
            arrange transport for you.
          </p>
          <a href="${transportChoiceUrl}" style="display: inline-block; background-color: #C75D3A; color: #FBF7EE; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-top: 16px;">
            Choose Pickup or Transport
          </a>
          <p style="font-size: 14px; color: #5C7A5E; margin-top: 32px;">
            If you have any questions, just reply to this email — we're happy to help.
          </p>
          <p style="font-size: 14px; color: #5C7A5E; margin-top: 24px;">
            Warmly,<br/>
            Happy Paws Rescue Haven
          </p>
        </div>
      `;
    } else {
      // type === 'application_approved'
      if (!applicationId) {
        return new Response(
          JSON.stringify({ error: "Missing required field for application_approved: applicationId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const checkoutUrl = `${SITE_URL}/checkout/${applicationId}`;
      subject = `Your application for ${petName} has been approved!`;
      emailHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #FBF7EE; color: #1F2A1E;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">Great news, ${adopterName}!</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            Your application to adopt <strong>${petName}</strong> has been approved by our team.
            We're so excited to help you welcome ${petName} into your home.
          </p>
          <p style="font-size: 16px; line-height: 1.6;">
            The next step is to complete the adoption fee payment to finalize the process.
          </p>
          <a href="${checkoutUrl}" style="display: inline-block; background-color: #C75D3A; color: #FBF7EE; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-top: 16px;">
            Complete Adoption Payment
          </a>
          <p style="font-size: 14px; color: #5C7A5E; margin-top: 32px;">
            If you have any questions, just reply to this email — we're happy to help.
          </p>
          <p style="font-size: 14px; color: #5C7A5E; margin-top: 24px;">
            Warmly,<br/>
            Happy Paws Rescue Haven
          </p>
        </div>
      `;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [adopterEmail],
        subject,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-approval-email error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});