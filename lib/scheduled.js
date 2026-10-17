// Scheduled stories: a story whose publish date is still in the future stays off the site until a
// build runs after that time (the scheduled rebuild runs at 9am, 3pm, 9pm and 3am UAE time).
// Set SHOW_SCHEDULED=1 to preview scheduled stories locally.
export function isScheduled(date) {
  return !process.env.SHOW_SCHEDULED && date > new Date();
}
