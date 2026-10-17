// Rebuilds the site every 6 hours so the Videos and Photos tabs pick up new YouTube uploads and galleries,
// and scheduled (future-dated) stories go live. Runs at 05:00, 11:00, 17:00 and 23:00 UTC:
// 9am, 3pm, 9pm and 3am UAE time, so a story scheduled for 9am UAE appears at about 9:01.
// Needs a Netlify build hook URL saved as the BUILD_HOOK_URL environment variable
// (Site configuration > Build & deploy > Build hooks). Never commit the URL itself.

export default async () => {
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) {
    console.warn("BUILD_HOOK_URL is not set: skipping scheduled rebuild");
    return new Response("BUILD_HOOK_URL not set", { status: 200 });
  }
  const response = await fetch(hook, { method: "POST" });
  return new Response(`Build hook answered ${response.status}`);
};

export const config = { schedule: "0 5,11,17,23 * * *" };
