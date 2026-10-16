// Facts about the current build, published at /build.json so anyone can check when the site
// last rebuilt and why. Netlify sets these variables during its builds. Never add
// INCOMING_HOOK_URL here: that is the private build hook address.
export default {
  time: new Date().toISOString(),
  context: process.env.CONTEXT || "local",
  commit: process.env.COMMIT_REF || null,
  trigger: process.env.INCOMING_HOOK_TITLE ? `build hook: ${process.env.INCOMING_HOOK_TITLE}` : process.env.CONTEXT ? "git push" : "local build",
};
