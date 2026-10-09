// Rebuilds the site every 6 hours so the Videos and Photos tabs pick up new YouTube uploads and galleries.
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

export const config = { schedule: "0 */6 * * *" };
