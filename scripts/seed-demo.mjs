#!/usr/bin/env node
// Fills the LOCAL dev storage (the KV that `npm run dev` emulates) with the made-up
// demo family: photos from public/demo/, a few messages and a to-do list, so /kitchen
// and the frame app have something to show. Never touches a deployed Worker.
//   npm run seed:demo
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const now = Date.now();
const min = 60_000;
const id = (at) => `${at}-${Math.floor(Math.random() * 1000)}`;

const photos = [
  ["santacruz-dog.jpg", "Sam", "Biscuit's favourite time of day", 3],
  ["sunday-roast.jpg", "Anne", "Sunday lunch is on — wish you were all here", 40],
  ["queenstown-ski.jpg", "Tom", "First proper powder day of the season!", 95],
  ["edinburgh-coffee.jpg", "Kate", "Morning wander up the Old Town", 180],
  ["shell-hand.jpg", "Sam", "She insisted this one comes home with us", 300],
  ["bass-rock-mist.jpg", "Kate", "Misty walk at North Berwick this morning", 420],
  ["sourdough.jpg", "Peter", "Finally got the crust right!", 600],
  ["mtb-trail.jpg", "Tom", "Quick ride before work", 900],
].map(([file, from, caption, ago]) => ({ id: id(now - ago * min), url: `/demo/${file}`, from, caption, at: now - ago * min }));

const notes = [
  ["fish and chips tonight?", "Peter", 5],
  ["landed safely, love you all x", "Kate", 120],
  ["call you sunday!", "Tom", 400],
].map(([text, from, ago]) => ({ id: id(now - ago * min), text, from, at: now - ago * min }));

const todos = [
  ["Book the chimney sweep", false],
  ["Birthday card for Kate", false],
  ["Pick up the sourdough flour", true],
  ["Ring the garage about the MOT", false],
].map(([text, done], i) => ({ id: `todo-demo${i}`, text, done, at: now - i * 60 * min, ...(done ? { doneAt: now } : {}) }));

// Reminders show on the frame's calendar and "Happening today" card (dates in the household's own time zone).
const ymd = (daysAhead) => new Date(now + daysAhead * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const reminders = [
  { id: "demo-lunch", text: "Sunday lunch — Kate on FaceTime", time: "13:00", color: "#B0607A", repeat: { kind: "weekly", days: [0], everyWeeks: 1, from: ymd(-30) } },
  { id: "demo-choir", text: "Choir", time: "19:00", color: "#5E7E5E", repeat: { kind: "weekly", days: [3], everyWeeks: 1, from: ymd(-30) } },
  { id: "demo-dentist", text: "Dentist — Peter", time: "10:30", color: "#4E6A8E", repeat: { kind: "once", date: ymd(2) } },
  { id: "demo-market", text: "Farmers' market", time: null, color: "#A0703A", repeat: { kind: "once", date: ymd(5) } },
  { id: "demo-tom", text: "Tom's flight lands 6am", time: "06:00", color: "#7A5E8E", repeat: { kind: "once", date: ymd(17) } },
  { id: "demo-book", text: "Book club", time: "19:30", color: "#5E6E7E", repeat: { kind: "monthly", day: 15 } },
];

const dir = mkdtempSync(join(tmpdir(), "cv-seed-"));
const put = (key, value) => {
  const file = join(dir, key.replace(/\W/g, "_") + ".json");
  writeFileSync(file, JSON.stringify(value));
  execFileSync("npx", ["wrangler", "kv", "key", "put", "--binding", "FRAME", "--local", key, "--path", file], { stdio: "inherit" });
};

put("frame:photos", photos);
put("frame:notes", notes);
put("family:todos", todos);
put("family:settings", { reminders, showNews: false });
console.log(`Seeded ${photos.length} photos, ${notes.length} messages, ${todos.length} to-dos and ${reminders.length} reminders into local dev storage.`);
