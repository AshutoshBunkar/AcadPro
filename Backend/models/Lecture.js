import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
  offeringId: { type: mongoose.Schema.Types.ObjectId, ref: "TeachingAssignment", index: true },
  referenceSemesters: { type: [Number], default: [] },
  department: String,
  mediaType: String,
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Topic'
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Faculty'
  },

  title: {
    type: String,
    required: true,
  },

  videoUrl: {
    type: String,
    required: true,
    unique: true
  },

  cloudinaryPublicId: {
    type: String,
    required: true,
    unique: true
  },

  thumbnailUrl: {
    type: String,
    default: ""
  },

  duration: {
    type: Number,
    default: 0,
  },

  description: {
    type: String
  }

}, { timestamps: true });

export const Lecture = mongoose.model("Lecture", lectureSchema);