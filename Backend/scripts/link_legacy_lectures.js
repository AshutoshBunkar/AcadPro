import "dotenv/config";
import mongoose from "mongoose";
import { Lecture } from "../models/Lecture.js";
import { Topic } from "../models/Topic.js";
import { Subject } from "../models/Subject.js";
import { TeachingAssignment } from "../models/TeachingAssignment.js";

const apply = process.argv.includes("--apply");
await mongoose.connect(process.env.MONGO_DB_URL);
try {
  let linked = 0, manual = 0;
  for await (const lecture of Lecture.find({ offeringId: null }).cursor()) {
    const topic = await Topic.findById(lecture.topicId);
    const subject = topic && await Subject.findById(topic.subjectId);
    const offerings = subject ? await TeachingAssignment.find({ subjectId: subject._id, facultyId: lecture.uploadedBy }).limit(2) : [];
    if (offerings.length !== 1) { manual++; continue; }
    if (apply) await Lecture.updateOne({ _id: lecture._id, offeringId: null }, { offeringId: offerings[0]._id, department: subject.department });
    linked++;
  }
  console.log(JSON.stringify({ applied: apply, uniqueMatches: linked, requireRegistrarReview: manual }));
} finally { await mongoose.disconnect(); }
