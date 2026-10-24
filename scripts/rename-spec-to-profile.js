// One-off: the library summary stored on each component was called `spec`; it is `profile` now, so "spec" only means the
// design spec. Renames the field in place (values untouched). Safe to run again: it only touches documents that still
// have `spec`.
//   node --env-file=.env scripts/rename-spec-to-profile.js
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);
const res = await mongoose.connection.db.collection("components").updateMany({ spec: { $exists: true } }, { $rename: { spec: "profile" } });
console.log(`Renamed spec -> profile on ${res.modifiedCount} component(s).`);
await mongoose.disconnect();
