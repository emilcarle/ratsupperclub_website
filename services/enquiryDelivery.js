// Delivers a contact-form enquiry to the places where RAT will see it.
//
// An enquiry counts as delivered only if at least one channel succeeded.
// The visitor gets the thank-you message only when this returns
// { delivered: true }; otherwise they see the error message and keep what
// they typed (RAT Module 1, section 02: never thank someone for an enquiry
// that never arrived).
//
// Channels still to be built (see documentation/change_requests/rat_module_1.md):
//   - M1.03: internal notification email to the studio, plus the automatic
//     reply to the visitor (nodemailer over Zoho SMTP).
//   - M1.05: one row per enquiry in the "RAT — Website enquiries" Google
//     Sheet (via a Google Apps Script web app).
// Each one should run here, push its name into `channels` when it succeeds,
// and log (not throw) when it fails, so one failing channel doesn't stop
// the other.
//
// Until then, ENQUIRY_TEST_MODE=true in .env makes the form "succeed" by
// writing a short line to the server log. Use it locally and on staging only.

export async function deliverEnquiry(enquiry) {
  const channels = [];

  // M1.03 and M1.05 go here.

  if (channels.length === 0 && process.env.ENQUIRY_TEST_MODE === "true") {
    console.log(
      `[enquiry:test-mode] received from source=${enquiry.source}: ` +
      `name="${enquiry.name}", organisation="${enquiry.organisation}", ` +
      `message of ${enquiry.message.length} characters. Not sent anywhere.`
    );
    return { delivered: true, channels: ["test-log"] };
  }

  if (channels.length === 0) {
    console.error("[enquiry] No delivery channel configured or all failed; the enquiry was NOT delivered.");
  }

  return { delivered: channels.length > 0, channels };
}
